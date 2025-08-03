/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { SupplyChainContract } from './supply-chain-contract';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import winston = require('winston');
import { Product } from '../models/product';
import { ProductLocationData } from '../models/product-location-data';
import { ProductLocationEntry } from '../models/product-location-entry';
import { describe } from 'mocha';
import { ProductWithHistory } from '../models/product-with-history';

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

class TestContext implements Context {
    public stub: sinon.SinonStubbedInstance<ChaincodeStub> = sinon.createStubInstance(ChaincodeStub);
    public clientIdentity: sinon.SinonStubbedInstance<ClientIdentity> = sinon.createStubInstance(ClientIdentity);
    public logger = {
        getLogger: sinon.stub().returns(sinon.createStubInstance(winston.createLogger().constructor)),
        setLevel: sinon.stub(),
     };
}

const createTestProduct = () => {
    const product = new Product();
    product.id = '1003';
    product.barcode = '1234567890';
    product.batchQuantity = 1000;
    product.category = 'Fruit Jams';
    product.componentProductIds = [];
    product.expirationDate = '2022-06-24T18:25:43.511Z';
    product.misc = 'test-misc-data';
    product.name = 'Apple Jam';
    product.placeOfOrigin = 'Etobicoke, ON, Canada';
    product.productionDate = '2021-06-24T18:25:43.511Z';
    product.unitPrice = '$5.00';
    product.unitQuantity = 300;
    product.unitQuantityType = 'mg';
    product.variety = null;

    const locationData = new ProductLocationData();
    locationData.current = new ProductLocationEntry({
        arrivalDate: '2021-06-30T18:00:58.511Z',
        location: 'Walmart Supercentre - 900 Dufferin St, Toronto, ON',
    });
    locationData.previous = [
        new ProductLocationEntry({
            arrivalDate: '2021-06-24T18:25:43.511Z',
            location: 'Etobicoke, ON, Canada',
        }),
        new ProductLocationEntry({
            arrivalDate: '2021-06-25T09:05:12.511Z',
            location: 'Brampton, ON, Canada',
        }),
    ];
    product.locationData = locationData;

    return product;
};

describe('SupplyChainContract', () => {

    let contract: SupplyChainContract;
    let ctx: TestContext;

    beforeEach(() => {
        contract = new SupplyChainContract();
        ctx = new TestContext();
        
        const testProductData = {
            "id": "1001",
            "barcode": "1234567890",
            "batchQuantity": 1000,
            "category": "Fruits",
            "componentProductIds": [],
            "expirationDate": "2022-06-24T18:25:43.511Z",
            "misc": "test-data",
            "name": "Apples",
            "placeOfOrigin": "Markham, ON, Canada",
            "productionDate": "2021-06-24T18:25:43.511Z",
            "unitPrice": "$5.00",
            "unitQuantity": 300,
            "unitQuantityType": "mg",
            "variety": null,
            "locationData": {
                "current": {
                    "arrivalDate": "2021-06-30T18:00:58.511Z",
                    "location": "Markham Farm, Markham, ON, Canada"
                },
                "previous": []
            }
        };
        
        ctx.stub.getState.withArgs('1001').resolves(Buffer.from(JSON.stringify(testProductData)));
        ctx.stub.getState.withArgs('1002').resolves(Buffer.from(JSON.stringify({...testProductData, id: '1002'})));
    });

    describe('#productExists', () => {
        it('should return true for a product', async () => {
            await contract.productExists(ctx, '1001').should.eventually.be.true;
        });

        it('should return false for a product that does not exist', async () => {
            await contract.productExists(ctx, '1003').should.eventually.be.false;
        });
    });

    describe('#createProduct', () => {
        it('should create a product', async () => {
            const product = createTestProduct();
            await contract.createProduct(ctx, JSON.stringify(product));
            ctx.stub.putState.should.have.been.calledOnceWith('1003');
        });

        it('should throw an error for a product that already exists', async () => {
            const product = createTestProduct();
            product.id = '1001';
            await contract.createProduct(ctx, JSON.stringify(product)).should.be.rejectedWith(/The product 1001 already exists./);
        });

        it('should throw an error for a product with missing id', async () => {
            const product = createTestProduct();
            product.id = '';
            await contract.createProduct(ctx, JSON.stringify(product)).should.be.rejectedWith(/The 'id' field is required./);
        });
    });

    describe('#shipProductTo', () => {
        it('should change current product location data to a new one', async () => {
            const productId = '1001';
            const newLocation = 'New Location';
            const newLocationArrivalDate = '2021-07-01T18:00:58.511Z';

            await contract.shipProductTo(ctx, productId, newLocation, newLocationArrivalDate);

            ctx.stub.putState.should.have.been.calledWith(productId, sinon.match((data: Buffer) => {
                const updatedProduct = JSON.parse(data.toString()) as Product;
                return updatedProduct.locationData.current.location === newLocation &&
                    updatedProduct.locationData.current.arrivalDate === newLocationArrivalDate;
            }));
        });

        it('should throw an error for a product that does not exist', async () => {
            await contract.shipProductTo(ctx, '1003', 'New Location', '2021-06-24T18:25:43.511Z').should.be.rejectedWith(/The product 1003 does not exist./);
        });
    });

    describe('#getProduct', () => {
        it('should return a product', async () => {
            const result = await contract.getProduct(ctx, '1001');
            result.should.have.property('id', '1001');
            result.should.have.property('name', 'Apples');
        });

        it('should throw an error for a product that does not exist', async () => {
            await contract.getProduct(ctx, '1003').should.be.rejectedWith(/The product 1003 does not exist./);
        });
    });
});