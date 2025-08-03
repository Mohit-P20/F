/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Product } from '../models/product';
import { ProductLocationEntry } from '../models/product-location-entry';
import { ProductWithHistory } from '../models/product-with-history';
import { QualityRecord } from '../models/quality-record';
import { Notification } from '../models/notification';
import { AnalyticsData } from '../models/analytics-data';

@Info({title: 'SupplyChainContract', description: 'Unified Smart Contract for Supply Chain Management' })
export class SupplyChainContract extends Contract {
    
    // ========================================================================
    // PRODUCT MANAGEMENT TRANSACTIONS
    // ========================================================================
    
    @Transaction(false)
    @Returns('boolean')
    public async productExists(ctx: Context, productId: string): Promise<boolean> {
        const data = await ctx.stub.getState(productId);
        return (!!data && data.length > 0);
    }

    @Transaction()
    public async createProduct(ctx: Context, productJson: string): Promise<void> {
        const product = JSON.parse(productJson) as Product;

        // Enhanced validation
        this.validateProductData(product);

        const exists: boolean = await this.productExists(ctx, product.id);
        if (exists) {
            throw new Error(`The product ${product.id} already exists.`);
        }

        const buffer = Buffer.from(JSON.stringify(product));
        await ctx.stub.putState(product.id, buffer);

        // Create notification for product creation
        await this.createNotification(ctx, {
            id: `NOTIF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productId: product.id,
            type: 'created',
            message: `Product ${product.name} created at ${product.placeOfOrigin}`,
            timestamp: new Date().toISOString(),
            location: product.placeOfOrigin,
            severity: 'info',
            acknowledged: false
        });
    }

    @Transaction()
    public async shipProductTo(ctx: Context, productId: string, newLocation: string, arrivalDate: string): Promise<void> {
        const exists: boolean = await this.productExists(ctx, productId);
        if (!exists) {
            throw new Error(`The product ${productId} does not exist.`);
        }

        this.requireField(newLocation, 'newLocation');
        this.requireField(arrivalDate, 'arrivalDate');

        // Validate date format
        if (!this.isValidDate(arrivalDate)) {
            throw new Error('Invalid arrival date format. Use ISO 8601 format.');
        }

        const product = await this.readProduct(ctx, productId);

        product.locationData.previous.push(new ProductLocationEntry({
            arrivalDate: product.locationData.current.arrivalDate,
            location: product.locationData.current.location
        }));
        product.locationData.current.arrivalDate = arrivalDate;
        product.locationData.current.location = newLocation;

        const buffer = Buffer.from(JSON.stringify(product));
        await ctx.stub.putState(productId, buffer);

        // Create notification for shipment
        await this.createNotification(ctx, {
            id: `NOTIF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productId: productId,
            type: 'shipped',
            message: `Product ${product.name} shipped to ${newLocation}`,
            timestamp: new Date().toISOString(),
            location: newLocation,
            severity: 'info',
            acknowledged: false
        });
    }

    @Transaction(false)
    @Returns('Product')
    public async getProduct(ctx: Context, productId: string): Promise<Product> {
        const exists: boolean = await this.productExists(ctx, productId);
        if (!exists) {
            throw new Error(`The product ${productId} does not exist.`);
        }

        return this.readProduct(ctx, productId);
    }

    @Transaction(false)
    @Returns('ProductHistory')
    public async getProductWithHistory(ctx: Context, productId: string): Promise<ProductWithHistory> {
        const exists: boolean = await this.productExists(ctx, productId);
        if (!exists) {
            throw new Error(`The product ${productId} does not exist.`);
        }

        const product = await this.readProduct(ctx, productId);
        const productWithHistory = new ProductWithHistory(product);
        productWithHistory.componentProducts = [];

        for (const childProductId of product.componentProductIds) {
            try {
                const childProduct = await this.readProduct(ctx, childProductId);
                productWithHistory.componentProducts.push(childProduct);
            } catch (error) {
                console.log(`Component product ${childProductId} not found, skipping`);
            }
        }

        return productWithHistory;
    }

    @Transaction(false)
    @Returns('Array<Product>')
    public async queryAllProducts(ctx: Context): Promise<Product[]> {
        const queryString = '{"selector":{"id":{"$exists":true}}}';
        return this.executeQuery(ctx, queryString);
    }

    @Transaction(false)
    @Returns('Array<Product>')
    public async queryProductsByCategory(ctx: Context, category: string): Promise<Product[]> {
        const queryString = `{"selector":{"category":"${category}"}}`;
        return this.executeQuery(ctx, queryString);
    }

    @Transaction(false)
    @Returns('Array<Product>')
    public async queryProductsByLocation(ctx: Context, location: string): Promise<Product[]> {
        const queryString = `{"selector":{"locationData.current.location":"${location}"}}`;
        return this.executeQuery(ctx, queryString);
    }

    // ========================================================================
    // QUALITY ASSURANCE TRANSACTIONS
    // ========================================================================

    @Transaction()
    public async addQualityRecord(ctx: Context, productId: string, qualityData: string): Promise<void> {
        const exists: boolean = await this.productExists(ctx, productId);
        if (!exists) {
            throw new Error(`The product ${productId} does not exist.`);
        }

        const qualityRecord = JSON.parse(qualityData) as QualityRecord;
        this.validateQualityRecord(qualityRecord);

        const qualityKey = `QUALITY_${productId}_${Date.now()}`;
        const buffer = Buffer.from(JSON.stringify(qualityRecord));
        await ctx.stub.putState(qualityKey, buffer);

        // Create notification for quality check
        const severity = qualityRecord.score >= 80 ? 'info' : qualityRecord.score >= 60 ? 'warning' : 'error';
        await this.createNotification(ctx, {
            id: `NOTIF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productId: productId,
            type: 'quality_check',
            message: `Quality inspection completed for ${productId}. Score: ${qualityRecord.score}/100`,
            timestamp: new Date().toISOString(),
            location: qualityRecord.location,
            severity: severity,
            acknowledged: false
        });
    }

    @Transaction(false)
    @Returns('Array<QualityRecord>')
    public async getQualityRecords(ctx: Context, productId: string): Promise<QualityRecord[]> {
        const startKey = `QUALITY_${productId}_`;
        const endKey = `QUALITY_${productId}_\uffff`;
        
        const resultsIterator = await ctx.stub.getStateByRange(startKey, endKey);
        const qualityRecords: QualityRecord[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            try {
                const record = JSON.parse(strValue) as QualityRecord;
                qualityRecords.push(record);
            } catch (err) {
                console.log('Error parsing quality record:', err);
            }
            result = await resultsIterator.next();
        }
        await resultsIterator.close();
        return qualityRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // ========================================================================
    // ANALYTICS TRANSACTIONS
    // ========================================================================

    @Transaction(false)
    @Returns('AnalyticsData')
    public async getAnalyticsData(ctx: Context): Promise<AnalyticsData> {
        const products = await this.queryAllProducts(ctx);
        
        // Calculate analytics
        const totalProducts = products.length;
        const categoryStats: { [key: string]: number } = {};
        const locationStats: { [key: string]: number } = {};
        let totalDeliveryTime = 0;
        let deliveryCount = 0;
        let onTimeDeliveries = 0;
        let totalQualityScore = 0;
        let qualityCount = 0;
        
        // Monthly trends calculation
        const monthlyData: { [key: string]: { products: number; shipments: number } } = {};
        
        for (const product of products) {
            // Category statistics
            categoryStats[product.category] = (categoryStats[product.category] || 0) + 1;
            
            // Location statistics
            const currentLocation = product.locationData.current.location;
            locationStats[currentLocation] = (locationStats[currentLocation] || 0) + 1;
            
            // Monthly trends
            const productionMonth = new Date(product.productionDate).toISOString().substring(0, 7);
            if (!monthlyData[productionMonth]) {
                monthlyData[productionMonth] = { products: 0, shipments: 0 };
            }
            monthlyData[productionMonth].products++;
            
            // Calculate delivery metrics if product has moved
            if (product.locationData.previous.length > 0) {
                const firstLocation = product.locationData.previous[0];
                const currentLocation = product.locationData.current;
                const deliveryTime = new Date(currentLocation.arrivalDate).getTime() - 
                                   new Date(firstLocation.arrivalDate).getTime();
                totalDeliveryTime += deliveryTime;
                deliveryCount++;
                
                // Count shipments for monthly trends
                const shipmentMonth = new Date(currentLocation.arrivalDate).toISOString().substring(0, 7);
                if (monthlyData[shipmentMonth]) {
                    monthlyData[shipmentMonth].shipments++;
                }
                
                // Assume on-time if delivered within expected timeframe
                const deliveryDays = deliveryTime / (1000 * 60 * 60 * 24);
                if (deliveryDays <= 7) {
                    onTimeDeliveries++;
                }
            }
        }
        
        // Get quality records for quality score calculation
        try {
            const allQualityRecords = await this.getAllQualityRecords(ctx);
            for (const record of allQualityRecords) {
                totalQualityScore += record.score;
                qualityCount++;
            }
        } catch (error) {
            console.log('Error fetching quality records for analytics:', error);
        }
        
        const averageDeliveryTime = deliveryCount > 0 ? 
            Math.round(totalDeliveryTime / deliveryCount / (1000 * 60 * 60 * 24)) : 0;
        
        const onTimeDeliveryRate = deliveryCount > 0 ? 
            Math.round((onTimeDeliveries / deliveryCount) * 100) : 100;
        
        const qualityScore = qualityCount > 0 ? 
            Math.round((totalQualityScore / qualityCount) * 10) / 10 : 95.0;
        
        // Convert monthly data to array
        const monthlyTrends = Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6) // Last 6 months
            .map(([month, data]) => ({
                month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
                products: data.products,
                shipments: data.shipments
            }));
        
        return {
            totalProducts,
            activeShipments: products.filter(p => p.locationData.previous.length > 0 && p.locationData.previous.length < 3).length,
            completedDeliveries: products.filter(p => p.locationData.previous.length >= 2).length,
            averageDeliveryTime,
            onTimeDeliveryRate,
            qualityScore,
            categoryStats,
            locationStats,
            monthlyTrends
        };
    }

    // ========================================================================
    // NOTIFICATION TRANSACTIONS
    // ========================================================================

    @Transaction(false)
    @Returns('Array<Notification>')
    public async getNotifications(ctx: Context, limit?: string): Promise<Notification[]> {
        const queryLimit = limit ? parseInt(limit) : 50;
        const queryString = `{"selector":{"type":{"$exists":true}},"sort":[{"timestamp":"desc"}],"limit":${queryLimit}}`;
        
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const notifications: Notification[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            try {
                const record = JSON.parse(strValue) as Notification;
                notifications.push(record);
            } catch (err) {
                console.log('Error parsing notification:', err);
            }
            result = await resultsIterator.next();
        }
        await resultsIterator.close();
        return notifications;
    }

    @Transaction()
    public async acknowledgeNotification(ctx: Context, notificationId: string): Promise<void> {
        const data = await ctx.stub.getState(notificationId);
        if (!data || data.length === 0) {
            throw new Error(`Notification ${notificationId} does not exist.`);
        }

        const notification = JSON.parse(data.toString()) as Notification;
        notification.acknowledged = true;

        const buffer = Buffer.from(JSON.stringify(notification));
        await ctx.stub.putState(notificationId, buffer);
    }

    // ========================================================================
    // PRIVATE HELPER METHODS
    // ========================================================================

    private validateProductData(product: Product): void {
        this.requireField(product.id, 'id');
        this.requireField(product.name, 'name');
        this.requireField(product.barcode, 'barcode');
        this.requireField(product.placeOfOrigin, 'placeOfOrigin');
        this.requireField(product.productionDate, 'productionDate');
        this.requireField(product.expirationDate, 'expirationDate');
        this.requireField(product.unitQuantity, 'unitQuantity');
        this.requireField(product.unitQuantityType, 'unitQuantityType');
        this.requireField(product.unitPrice, 'unitPrice');
        this.requireField(product.category, 'category');
        this.requireField(product.locationData.current.location, 'locationData.current.location');
        this.requireField(product.locationData.current.arrivalDate, 'locationData.current.arrivalDate');

        // Validate dates
        if (!this.isValidDate(product.productionDate)) {
            throw new Error('Invalid production date format. Use ISO 8601 format.');
        }
        if (!this.isValidDate(product.expirationDate)) {
            throw new Error('Invalid expiration date format. Use ISO 8601 format.');
        }
        if (!this.isValidDate(product.locationData.current.arrivalDate)) {
            throw new Error('Invalid arrival date format. Use ISO 8601 format.');
        }

        // Validate business logic
        const productionDate = new Date(product.productionDate);
        const expirationDate = new Date(product.expirationDate);
        if (expirationDate <= productionDate) {
            throw new Error('Expiration date must be after production date.');
        }

        // Validate quantities
        if (product.unitQuantity <= 0) {
            throw new Error('Unit quantity must be positive.');
        }
        if (product.batchQuantity && product.batchQuantity <= 0) {
            throw new Error('Batch quantity must be positive if specified.');
        }

        // Validate string lengths
        if (product.name.length > 100) {
            throw new Error('Product name too long (max 100 characters).');
        }
        if (product.placeOfOrigin.length > 200) {
            throw new Error('Place of origin too long (max 200 characters).');
        }
    }

    private validateQualityRecord(qualityRecord: QualityRecord): void {
        this.requireField(qualityRecord.inspector, 'inspector');
        this.requireField(qualityRecord.score, 'score');
        this.requireField(qualityRecord.notes, 'notes');
        this.requireField(qualityRecord.timestamp, 'timestamp');

        // Validate score range
        if (qualityRecord.score < 0 || qualityRecord.score > 100) {
            throw new Error('Quality score must be between 0 and 100.');
        }

        // Validate timestamp format
        if (!this.isValidDate(qualityRecord.timestamp)) {
            throw new Error('Invalid timestamp format. Use ISO 8601 format.');
        }
    }

    private isValidDate(dateString: string): boolean {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime()) && dateString.includes('T');
    }

    private async createNotification(ctx: Context, notificationData: Notification): Promise<void> {
        try {
            const buffer = Buffer.from(JSON.stringify(notificationData));
            await ctx.stub.putState(notificationData.id, buffer);
        } catch (error) {
            console.log(`Warning: Failed to create notification: ${error.message}`);
            // Don't fail the main transaction if notification creation fails
        }
    }

    private async executeQuery(ctx: Context, queryString: string): Promise<Product[]> {
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const products: Product[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            try {
                const record = JSON.parse(strValue) as Product;
                products.push(record);
            } catch (err) {
                console.log('Error parsing product:', err);
            }
            result = await resultsIterator.next();
        }
        await resultsIterator.close();
        return products;
    }

    private async getAllQualityRecords(ctx: Context): Promise<QualityRecord[]> {
        const queryString = '{"selector":{"inspector":{"$exists":true}}}';
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const qualityRecords: QualityRecord[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            try {
                const record = JSON.parse(strValue) as QualityRecord;
                qualityRecords.push(record);
            } catch (err) {
                console.log('Error parsing quality record:', err);
            }
            result = await resultsIterator.next();
        }
        await resultsIterator.close();
        return qualityRecords;
    }

    private async readProduct(ctx: Context, productId: string): Promise<Product> {
        const data = await ctx.stub.getState(productId);
        if (!data || data.length === 0) {
            throw new Error(`The product ${productId} does not exist.`);
        }
        const product = JSON.parse(data.toString()) as Product;
        return product;
    }

    private requireField(value: string | number, fieldName: string) {
        if (typeof value === 'string' && value.trim() === '') {
            throw new Error(`The '${fieldName}' field is required.`);
        } else if (value === null || value === undefined) {
             throw new Error(`The '${fieldName}' field is required.`);
        }
    }
}