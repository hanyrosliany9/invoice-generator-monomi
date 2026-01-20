-- Add latitude and longitude fields to CallSheet for Google Places coordinates
ALTER TABLE "call_sheets" ADD COLUMN "locationLat" DOUBLE PRECISION;
ALTER TABLE "call_sheets" ADD COLUMN "locationLng" DOUBLE PRECISION;
