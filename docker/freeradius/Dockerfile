FROM freeradius/freeradius-server:3.2.3-alpine

# Install mysql-client for utility script if needed, and bash for health check validation
RUN apk add --no-cache bash mysql-client mariadb-connector-c

# Enable the SQL module in FreeRADIUS
RUN ln -s /etc/raddb/mods-available/sql /etc/raddb/mods-enabled/sql

# Copy config files
COPY mods-enabled/sql /etc/raddb/mods-available/sql
COPY clients.conf /etc/raddb/clients.conf
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
