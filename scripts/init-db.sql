-- Grant permissions to bloom user
ALTER USER bloom WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE journey_builder TO bloom;
GRANT ALL ON SCHEMA public TO bloom;
ALTER SCHEMA public OWNER TO bloom;
