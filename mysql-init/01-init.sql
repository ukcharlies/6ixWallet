-- Grant all privileges to 6ixthedev user from any host
CREATE USER IF NOT EXISTS '6ixthedev'@'%' IDENTIFIED BY 'p@ssw0rd';
GRANT ALL PRIVILEGES ON 6ixwallet.* TO '6ixthedev'@'%';
GRANT ALL PRIVILEGES ON 6ixwallet_test.* TO '6ixthedev'@'%';
FLUSH PRIVILEGES;
