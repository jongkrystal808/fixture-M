-- =====================================
-- 治具管理系統 - 新增 Datecode 支援
-- v3.2 更新 (2025-12-05)
-- =====================================
-- 執行前請備份資料庫!
--
-- 更新內容:
-- 1. material_transactions 新增 datecode 和 record_type 欄位
-- 2. 更新存儲過程支援 datecode 類型
-- =====================================

USE fixture_management;

-- =====================================
-- 1. 修改 material_transactions 表
-- =====================================

-- 新增 record_type 欄位 (batch/individual/datecode)
ALTER TABLE material_transactions 
ADD COLUMN record_type ENUM('batch', 'individual', 'datecode') 
DEFAULT 'individual' 
COMMENT '記錄類型: batch=批量, individual=個別, datecode=日期碼'
AFTER transaction_type;

-- 新增 datecode 欄位
ALTER TABLE material_transactions 
ADD COLUMN datecode VARCHAR(50) 
COMMENT '日期碼 (當 record_type=datecode 時使用)'
AFTER source_type;

-- 新增索引
ALTER TABLE material_transactions 
ADD INDEX idx_datecode (datecode);

-- =====================================
-- 2. 更新存儲過程 sp_material_receipt
-- =====================================

DELIMITER //

DROP PROCEDURE IF EXISTS sp_material_receipt//

CREATE PROCEDURE sp_material_receipt(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_order_no VARCHAR(100),
    IN p_source_type ENUM('self_purchased', 'customer_supplied'),
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_created_by INT,
    IN p_record_type ENUM('batch', 'individual', 'datecode'),  -- ★ 新增
    IN p_datecode VARCHAR(50),  -- ★ 新增
    IN p_serials_csv TEXT,
    OUT p_transaction_id INT,
    OUT p_message VARCHAR(500)
)
BEGIN
    DECLARE v_qty INT DEFAULT 0;
    DECLARE v_transaction_date DATE;
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;
    DECLARE v_remaining TEXT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = CONCAT('收料失敗: ', @@error_count);
        SET p_transaction_id = NULL;
    END;

    START TRANSACTION;

    SET v_transaction_date = CURDATE();

    -- 1. 計算數量
    IF p_record_type = 'datecode' THEN
        -- datecode 模式：直接從數量參數獲取（serials_csv 包含數量）
        SET v_qty = CAST(p_serials_csv AS UNSIGNED);
    ELSE
        -- 原有邏輯：計算逗號分隔的序號數量
        SET v_qty = LENGTH(p_serials_csv) - LENGTH(REPLACE(p_serials_csv, ',', '')) + 1;
        IF TRIM(p_serials_csv) = '' THEN
            SET v_qty = 0;
        END IF;
    END IF;

    IF v_qty <= 0 THEN
        SET p_message = '數量必須大於 0';
        SET p_transaction_id = NULL;
        ROLLBACK;
        LEAVE sp_material_receipt;
    END IF;

    -- 2. 插入 material_transactions
    INSERT INTO material_transactions (
        transaction_type,
        record_type,      -- ★ 新增
        transaction_date,
        customer_id,
        order_no,
        fixture_id,
        source_type,
        datecode,         -- ★ 新增
        quantity,
        operator,
        note,
        created_by,
        created_at
    ) VALUES (
        'receipt',
        p_record_type,    -- ★ 新增
        v_transaction_date,
        p_customer_id,
        p_order_no,
        p_fixture_id,
        p_source_type,
        p_datecode,       -- ★ 新增
        v_qty,
        p_operator,
        p_note,
        p_created_by,
        NOW()
    );

    SET p_transaction_id = LAST_INSERT_ID();

    -- 3. 處理序號
    IF p_record_type = 'datecode' THEN
        -- datecode 模式：生成虛擬序號
        SET @i = 1;
        WHILE @i <= v_qty DO
            -- 序號格式: datecode-序號 (例如: 2024W12-001)
            SET v_serial = CONCAT(p_datecode, '-', LPAD(@i, 3, '0'));
            
            -- 插入 material_transaction_details
            INSERT INTO material_transaction_details (
                transaction_id,
                serial_number,
                created_at
            ) VALUES (
                p_transaction_id,
                v_serial,
                NOW()
            );

            -- 插入 fixture_serials
            INSERT INTO fixture_serials (
                customer_id,
                fixture_id,
                serial_number,
                source_type,
                status,
                receipt_date,
                receipt_transaction_id,
                created_at
            ) VALUES (
                p_customer_id,
                p_fixture_id,
                v_serial,
                p_source_type,
                'available',
                v_transaction_date,
                p_transaction_id,
                NOW()
            );

            SET @i = @i + 1;
        END WHILE;
    ELSE
        -- 原有邏輯：處理 batch / individual 序號
        SET v_remaining = p_serials_csv;

        WHILE LENGTH(v_remaining) > 0 DO
            SET v_pos = LOCATE(',', v_remaining);

            IF v_pos = 0 THEN
                SET v_serial = TRIM(v_remaining);
                SET v_remaining = '';
            ELSE
                SET v_serial = TRIM(SUBSTRING(v_remaining, 1, v_pos - 1));
                SET v_remaining = SUBSTRING(v_remaining, v_pos + 1);
            END IF;

            IF LENGTH(v_serial) > 0 THEN
                -- 插入 material_transaction_details
                INSERT INTO material_transaction_details (
                    transaction_id,
                    serial_number,
                    created_at
                ) VALUES (
                    p_transaction_id,
                    v_serial,
                    NOW()
                );

                -- 插入 fixture_serials
                INSERT INTO fixture_serials (
                    customer_id,
                    fixture_id,
                    serial_number,
                    source_type,
                    status,
                    receipt_date,
                    receipt_transaction_id,
                    created_at
                ) VALUES (
                    p_customer_id,
                    p_fixture_id,
                    v_serial,
                    p_source_type,
                    'available',
                    v_transaction_date,
                    p_transaction_id,
                    NOW()
                );
            END IF;
        END WHILE;
    END IF;

    COMMIT;
    SET p_message = CONCAT('收料成功, 共 ', v_qty, ' 件');
END//

-- =====================================
-- 3. 更新存儲過程 sp_material_return
-- =====================================

DROP PROCEDURE IF EXISTS sp_material_return//

CREATE PROCEDURE sp_material_return(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_order_no VARCHAR(100),
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_created_by INT,
    IN p_record_type ENUM('batch', 'individual', 'datecode'),  -- ★ 新增
    IN p_datecode VARCHAR(50),  -- ★ 新增
    IN p_serials_csv TEXT,
    OUT p_transaction_id INT,
    OUT p_message VARCHAR(500)
)
BEGIN
    DECLARE v_qty INT DEFAULT 0;
    DECLARE v_transaction_date DATE;
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;
    DECLARE v_remaining TEXT;
    DECLARE v_serial_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = CONCAT('退料失敗: ', @@error_count);
        SET p_transaction_id = NULL;
    END;

    START TRANSACTION;

    SET v_transaction_date = CURDATE();

    -- 1. 計算數量
    IF p_record_type = 'datecode' THEN
        SET v_qty = CAST(p_serials_csv AS UNSIGNED);
    ELSE
        SET v_qty = LENGTH(p_serials_csv) - LENGTH(REPLACE(p_serials_csv, ',', '')) + 1;
        IF TRIM(p_serials_csv) = '' THEN
            SET v_qty = 0;
        END IF;
    END IF;

    IF v_qty <= 0 THEN
        SET p_message = '數量必須大於 0';
        SET p_transaction_id = NULL;
        ROLLBACK;
        LEAVE sp_material_return;
    END IF;

    -- 2. 插入 material_transactions
    INSERT INTO material_transactions (
        transaction_type,
        record_type,
        transaction_date,
        customer_id,
        order_no,
        fixture_id,
        source_type,
        datecode,
        quantity,
        operator,
        note,
        created_by,
        created_at
    ) VALUES (
        'return',
        p_record_type,
        v_transaction_date,
        p_customer_id,
        p_order_no,
        p_fixture_id,
        NULL,  -- 退料時 source_type 從序號自動識別
        p_datecode,
        v_qty,
        p_operator,
        p_note,
        p_created_by,
        NOW()
    );

    SET p_transaction_id = LAST_INSERT_ID();

    -- 3. 處理序號
    IF p_record_type = 'datecode' THEN
        -- datecode 模式：查找對應的序號並退料
        -- 優先退料 available 狀態的序號
        SET @i = 0;
        
        WHILE @i < v_qty DO
            -- 查找一個可退料的序號
            SELECT id INTO v_serial_id
            FROM fixture_serials
            WHERE customer_id = p_customer_id
              AND fixture_id = p_fixture_id
              AND serial_number LIKE CONCAT(p_datecode, '-%')
              AND status IN ('available', 'deployed')
            ORDER BY 
                CASE status 
                    WHEN 'available' THEN 1 
                    WHEN 'deployed' THEN 2 
                END,
                id
            LIMIT 1;

            IF v_serial_id IS NOT NULL THEN
                -- 獲取序號
                SELECT serial_number INTO v_serial
                FROM fixture_serials
                WHERE id = v_serial_id;

                -- 插入明細
                INSERT INTO material_transaction_details (
                    transaction_id,
                    serial_number,
                    created_at
                ) VALUES (
                    p_transaction_id,
                    v_serial,
                    NOW()
                );

                -- 更新序號狀態
                UPDATE fixture_serials
                SET status = 'returned',
                    return_date = v_transaction_date,
                    return_transaction_id = p_transaction_id,
                    updated_at = NOW()
                WHERE id = v_serial_id;

                SET @i = @i + 1;
                SET v_serial_id = NULL;
            ELSE
                -- 找不到更多序號
                SET p_message = CONCAT('只找到 ', @i, ' 件可退料序號');
                ROLLBACK;
                LEAVE sp_material_return;
            END IF;
        END WHILE;
    ELSE
        -- 原有邏輯：處理具體序號
        SET v_remaining = p_serials_csv;

        WHILE LENGTH(v_remaining) > 0 DO
            SET v_pos = LOCATE(',', v_remaining);

            IF v_pos = 0 THEN
                SET v_serial = TRIM(v_remaining);
                SET v_remaining = '';
            ELSE
                SET v_serial = TRIM(SUBSTRING(v_remaining, 1, v_pos - 1));
                SET v_remaining = SUBSTRING(v_remaining, v_pos + 1);
            END IF;

            IF LENGTH(v_serial) > 0 THEN
                -- 查找序號
                SELECT id INTO v_serial_id
                FROM fixture_serials
                WHERE customer_id = p_customer_id
                  AND fixture_id = p_fixture_id
                  AND serial_number = v_serial
                  AND status IN ('available', 'deployed')
                LIMIT 1;

                IF v_serial_id IS NULL THEN
                    SET p_message = CONCAT('序號 ', v_serial, ' 不存在或無法退料');
                    ROLLBACK;
                    LEAVE sp_material_return;
                END IF;

                -- 插入明細
                INSERT INTO material_transaction_details (
                    transaction_id,
                    serial_number,
                    created_at
                ) VALUES (
                    p_transaction_id,
                    v_serial,
                    NOW()
                );

                -- 更新序號狀態
                UPDATE fixture_serials
                SET status = 'returned',
                    return_date = v_transaction_date,
                    return_transaction_id = p_transaction_id,
                    updated_at = NOW()
                WHERE id = v_serial_id;
            END IF;
        END WHILE;
    END IF;

    COMMIT;
    SET p_message = CONCAT('退料成功, 共 ', v_qty, ' 件');
END//

DELIMITER ;

-- =====================================
-- 完成
-- =====================================

SELECT 'Datecode 功能更新完成!' AS Status;
