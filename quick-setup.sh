@@ .. @@
 # Update .env file with development settings
 grep -q "TLS_ENABLED=false" .env || echo "TLS_ENABLED=false" >> .env
 grep -q "NODE_ENV=development" .env || echo "NODE_ENV=development" >> .env
+grep -q "VERBOSE_LOGGING=false" .env || echo "VERBOSE_LOGGING=false" >> .env
 
 log_success "Environment configured for development"