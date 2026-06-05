-- Reference accounts required by PSAK 72 deferred revenue + PSAK 57 WIP/unbilled revenue.
-- Idempotent: skips if the code already exists.
INSERT INTO "chart_of_accounts"
  ("id","code","name","nameId","accountType","accountSubType","normalBalance","isControlAccount","isTaxAccount","currency","isCurrencyAccount","isActive","isSystemAccount","description","descriptionId","createdAt","updatedAt")
VALUES
  (gen_random_uuid()::text,'2-1020','Deferred Revenue','Pendapatan Diterima Dimuka','LIABILITY','CURRENT_LIABILITY','CREDIT',true,false,'IDR',false,true,true,'Deferred/unearned revenue (PSAK 72)','Pendapatan diterima dimuka (PSAK 72)',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  (gen_random_uuid()::text,'1-2020','Unbilled Revenue','Pendapatan Belum Ditagih','ASSET','CURRENT_ASSET','DEBIT',true,false,'IDR',false,true,true,'Unbilled revenue / WIP (PSAK 57)','Pendapatan belum ditagih / WIP (PSAK 57)',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
