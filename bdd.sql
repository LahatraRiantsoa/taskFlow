CREATE DATABASE taskflow;

CREATE USER taskflow WITH PASSWORD 'taskflow';
GRANT ALL PRIVILEGES ON DATABASE taskflow TO taskflow;

INSERT INTO "user" (email, name, roles, password)
VALUES (
    'admin@taskflow.local', 
    'Admin', 
    '["ROLE_ADMIN"]', 
    '$2y$12$7eIVso1uiBMV4D1PswUwselWnFzJWOb2ALHn5bwJGLM3LLwsAiq42'
);
--  password: admin