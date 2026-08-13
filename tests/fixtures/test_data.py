"""Shared test data, sample documents, queries, and DDL scripts for FKIP testing."""

SAMPLE_ORACLE_DDL = """
CREATE TABLE ACCOUNTS (
    ACCOUNT_ID NUMBER PRIMARY KEY,
    CUSTOMER_ID NUMBER NOT NULL,
    ACCOUNT_TYPE VARCHAR2(50),
    BALANCE NUMBER(18,2) DEFAULT 0.00,
    STATUS VARCHAR2(20) DEFAULT 'ACTIVE',
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE TRANSACTIONS (
    TRANSACTION_ID NUMBER PRIMARY KEY,
    ACCOUNT_ID NUMBER REFERENCES ACCOUNTS(ACCOUNT_ID),
    AMOUNT NUMBER(18,2) NOT NULL,
    TRANSACTION_TYPE VARCHAR2(30),
    TRANSACTION_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE VIEW ACTIVE_ACCOUNT_SUMMARY AS
SELECT A.ACCOUNT_ID, A.ACCOUNT_TYPE, A.BALANCE, COUNT(T.TRANSACTION_ID) AS TX_COUNT
FROM ACCOUNTS A
LEFT JOIN TRANSACTIONS T ON T.ACCOUNT_ID = A.ACCOUNT_ID
WHERE A.STATUS = 'ACTIVE'
GROUP BY A.ACCOUNT_ID, A.ACCOUNT_TYPE, A.BALANCE;

CREATE TRIGGER TRG_AUDIT_TRANSACTIONS
BEFORE INSERT ON TRANSACTIONS
FOR EACH ROW
BEGIN
    NULL;
END;
"""

SAMPLE_TEXT_DOC = """# FinXSystems Core Banking Settlement Engine Specification

## 1. Executive Architecture
The FinXSystems Settlement Engine processes multi-currency financial ledger transactions across tier-1 banking institutions. It utilizes distributed partition queues and real-time reconciliation ledgers to maintain sub-millisecond ACID consistency.

## 2. Ledger Partition Management
Ledger partitions are dynamically scaled across primary and secondary storage volumes. Each transaction batch is cryptographically hashed and verified against the core treasury audit ledger.

## 3. High Availability and Disaster Recovery
The active-passive cluster replicates transaction state logs with a target Recovery Point Objective (RPO) of zero and Recovery Time Objective (RTO) under 5 seconds.
"""

SAMPLE_LARGE_DOC = """# FinXSystems Large Enterprise Infrastructure & Performance Benchmark

""" + "\n\n".join([f"""## Section {i}: Core Ledger Partition {i} Telemetry
This section defines the architectural throughput, cryptographic hash verification, and partition memory layout for node cluster partition {i}.
All transactions routed to partition {i} undergo real-time ledger verification, balance validation, and distributed consensus validation.
Latency benchmarks for partition {i} must maintain P99 roundtrip times under 25 milliseconds across high-concurrency ingestion cycles.
""" for i in range(1, 51)])

UNSAFE_SQL_TEST_CASES = [
    ("DROP TABLE departments;", "DROP statement"),
    ("DELETE FROM employees WHERE id = 1;", "DELETE statement"),
    ("UPDATE employees SET salary = 999999;", "UPDATE statement"),
    ("TRUNCATE TABLE users;", "TRUNCATE statement"),
    ("ALTER TABLE users ADD COLUMN is_hacked BOOLEAN;", "ALTER statement"),
    ("CREATE TABLE backdoor (id INT);", "CREATE statement"),
    ("GRANT ALL PRIVILEGES ON DATABASE fkip_db TO public;", "GRANT statement"),
    ("SELECT * FROM departments; DROP TABLE users; --", "SQL Injection / Comment Bypass"),
    ("/* multi-line comment */ DROP TABLE departments;", "Multi-line Comment Bypass"),
]
