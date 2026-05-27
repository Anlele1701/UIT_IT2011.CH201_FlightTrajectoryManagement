# Flight Trajectory Backend

Backend này hiện được dọn theo hướng `CSV-first`: không còn gọi OpenSky live API nữa, mà lấy dữ liệu bay từ file CSV/JSON offline rồi nạp vào PostgreSQL.

## Mục tiêu hiện tại

- quản lý schema bằng TypeORM
- lưu dữ liệu bay vào PostgreSQL
- hỗ trợ PostGIS cho `geom` và truy vấn không gian
- giữ cấu trúc đủ gần với ERD để tiếp tục mở rộng sau này
- ưu tiên import dữ liệu thật từ file OpenSky thay vì ingest API real-time

## Cấu trúc project

- [`src/app.ts`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/src/app.ts)
  Khởi tạo Express app và đăng ký các route đọc dữ liệu.

- [`src/server.ts`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/src/server.ts)
  Entry point của backend. File này chỉ khởi động database connection và web server.

- [`src/config/`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/src/config)
  Chứa cấu hình môi trường và `DataSource` của TypeORM.

- [`src/entity/`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/src/entity)
  Chứa các entity mapping sang bảng database như `flights`, `flight_points`, `flight_events`, `airspace_zones`, `airports`, `airlines`, `aircraft`.

- [`src/migrations/`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/src/migrations)
  Chứa migration tạo schema database.

- [`src/routes/`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/src/routes)
  Chứa các route đọc dữ liệu, hiện chủ yếu là:
  - `GET /api/health`
  - `GET /api/flight-points`
  - `GET /api/flight-events`

- [`src/services/`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/src/services)
  Chứa logic xử lý dữ liệu:
  - `flight-ingestion.service.ts`: normalize, upsert `flights`, insert `flight_points`, tạo `flight_events`
  - `opensky-file.service.ts`: đọc file OpenSky CSV/JSON
  - `opensky-normalizer.ts`: map dữ liệu đầu vào sang format nội bộ

- [`src/scripts/`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/src/scripts)
  Chứa các script chạy tay:
  - import airspace zone
  - seed reference data
  - import file OpenSky

- [`sql/`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql)
  Chứa các file SQL import nhanh bằng `psql` và `\copy`.

## Các bảng chính

- `flights`
  Lưu “chuyến bay quan sát được”, không phải flight schedule đầy đủ từ airline system.

- `flight_points`
  Bảng quan trọng nhất. Mỗi dòng là một điểm vị trí máy bay theo thời gian.

- `airspace_zones`
  Polygon các vùng không phận để phục vụ geofence/restricted-zone detection.

- `flight_events`
  Log sự kiện được suy ra từ dữ liệu bay, ví dụ `geofence_entry`.

## Setup

1. Vào thư mục backend:

```bash
cd backend
```

2. Cài dependency:

```bash
npm install
```

3. Tạo file môi trường:

```bash
cp .env.example .env
```

4. Đảm bảo PostgreSQL của bạn đang chạy và `.env` khớp với DB đó.

5. Chạy migration:

```bash
npm run migration:run
```

Nếu muốn reset toàn bộ bảng nghiệp vụ, chạy lại migration, rồi import lại CSV OpenSky trong source bằng `psql \copy`:

```bash
npm run db:remigrate:opensky-csv
```

6. Nếu cần seed dữ liệu tham chiếu:

```bash
npm run seed:reference-data
```

7. Chạy server:

```bash
npm run dev
```

## Import dữ liệu từ file OpenSky

### Cách 1: qua script Node.js

Hỗ trợ:

- JSON snapshot kiểu `{ "time": ..., "states": [...] }`
- CSV state vectors

Ví dụ:

```bash
npm run import:opensky-state-file -- --file /absolute/path/to/opensky.json
```

Hoặc:

```bash
npm run import:opensky-state-file -- --file /absolute/path/to/state_vectors.csv --limit 10000
```

Script này sẽ:

- chuẩn hóa dữ liệu đầu vào
- upsert `flights`
- insert `flight_points`
- tạo `flight_events` khi phù hợp

### Cách 2: import nhanh bằng `psql` và `\copy`

Nếu file CSV lớn và bạn muốn import nhanh nhất, dùng:

```bash
npm run db:import:opensky-csv
```

File SQL:

- [`import_opensky_state_vectors.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/import_opensky_state_vectors.sql)

Script này đọc trực tiếp CSV trong source:

- [`src/data/2020-05-04_flight_datas.csv`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/src/data/2020-05-04_flight_datas.csv)

Dữ liệu vị trí được lưu ở cả:

- `flight_points.geom`: `POINT(longitude latitude)`
- `flight_points.geom_3d`: `POINT Z(longitude latitude altitude_m)`

## API hiện tại

- `GET /api/health`
- `GET /api/flight-points`
- `GET /api/flight-events`

Hiện backend không còn endpoint gọi OpenSky live API nữa.

## Kịch bản benchmark PostgreSQL thuần vs TimescaleDB + PostGIS

Bạn có thể dùng cùng một bộ dữ liệu CSV đã import để so sánh 2 hệ:

- PostgreSQL thuần:
  - không dùng PostGIS
  - không có `geom`
  - truy vấn không gian phải dùng công thức/toán học như Haversine hoặc ray-casting
- TimescaleDB + PostGIS:
  - `flight_points` là hypertable
  - truy vấn không gian dùng hàm `ST_*`

Các file benchmark nằm ở:

- [`sql/benchmark/`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark)

### Dựng database PostgreSQL thuần

Script này sẽ:

- tạo database `flight_trajectory_pg_plain`
- export dữ liệu benchmark từ database Timescale hiện tại
- import sang database PostgreSQL thuần
- tạo các function phục vụ benchmark:
  - `benchmark_haversine_m`
  - `benchmark_point_in_polygon`

Chạy:

```bash
cd backend
bash scripts/setup_plain_postgres_benchmark.sh
```

Mặc định:

- source DB: `flight_trajectory`
- target DB: `flight_trajectory_pg_plain`

Bạn có thể override bằng biến môi trường:

```bash
SOURCE_DB=flight_trajectory TARGET_DB=flight_trajectory_pg_plain bash scripts/setup_plain_postgres_benchmark.sh
```

### Ý nghĩa của 2 nhánh benchmark

- `*_pg_*.sql`: chạy trên PostgreSQL thuần
- `*_ts_*.sql`: chạy trên TimescaleDB + PostGIS

Trong nhánh PostgreSQL thuần:

- Kịch bản 1 dùng `benchmark_point_in_polygon(...)`
- Kịch bản 3 dùng `benchmark_haversine_m(...)`
- Kịch bản 4 dựng quỹ đạo bằng `jsonb_agg(...)`

Như vậy bạn có thể chứng minh rõ:

- PostgreSQL thuần vẫn làm được bài toán không gian
- nhưng phải tự cài công thức/thuật toán
- còn TimescaleDB + PostGIS có sẵn hàm chuyên dụng

### Kịch bản 1: Truy vấn máy bay nằm trong vùng trời

- PostgreSQL: [`01_pg_aircraft_in_zone.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/01_pg_aircraft_in_zone.sql)
- TimescaleDB: [`01_ts_aircraft_in_zone.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/01_ts_aircraft_in_zone.sql)

Ví dụ:

```bash
psql -h localhost -U postgres -d flight_trajectory_pg_plain \
  -v zone_code='UA_RESTRICTED' \
  -v from_ts='2020-05-04 01:00:00+00' \
  -v to_ts='2020-05-04 02:00:00+00' \
  -f sql/benchmark/01_pg_aircraft_in_zone.sql
```

### Kịch bản 2: Thống kê số lượng điểm bay theo từng khoảng thời gian

- PostgreSQL: [`02_pg_count_points_by_interval.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/02_pg_count_points_by_interval.sql)
- TimescaleDB: [`02_ts_count_points_by_interval.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/02_ts_count_points_by_interval.sql)

Ví dụ:

```bash
psql -h localhost -U postgres -d flight_trajectory_pg_plain \
  -v from_ts='2020-05-04 01:00:00+00' \
  -v to_ts='2020-05-04 02:00:00+00' \
  -v bucket_size='10 minutes' \
  -f sql/benchmark/02_pg_count_points_by_interval.sql
```

### Kịch bản 3: Truy vấn các máy bay gần nhau cùng thời điểm

- PostgreSQL: [`03_pg_nearby_aircraft_same_time.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/03_pg_nearby_aircraft_same_time.sql)
- TimescaleDB: [`03_ts_nearby_aircraft_same_time.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/03_ts_nearby_aircraft_same_time.sql)

Ví dụ:

```bash
psql -h localhost -U postgres -d flight_trajectory_pg_plain \
  -v sample_ts='2020-05-04 01:10:00+00' \
  -v horizontal_radius_m='5000' \
  -v vertical_radius_m='300' \
  -f sql/benchmark/03_pg_nearby_aircraft_same_time.sql
```

### Kịch bản 4: Dựng quỹ đạo bay của một chuyến bay

- PostgreSQL: [`04_pg_build_flight_trajectory.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/04_pg_build_flight_trajectory.sql)
- TimescaleDB: [`04_ts_build_flight_trajectory.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/04_ts_build_flight_trajectory.sql)

Tìm `flight_key` trước:

```bash
psql -h localhost -U postgres -d flight_trajectory_pg_plain \
  -c "select flight_key, flight_number, first_seen_at from flights order by first_seen_at limit 20;"
```

Sau đó chạy:

```bash
psql -h localhost -U postgres -d flight_trajectory_pg_plain \
  -v flight_key='TXLU00:2020-05-04' \
  -f sql/benchmark/04_pg_build_flight_trajectory.sql
```

### Kịch bản 5: Thống kê số lượng máy bay theo từng khoảng thời gian

Đề mục của bạn đang trùng với kịch bản 2, nên trong project này mình hiểu kịch bản 5 là:

- đếm `DISTINCT icao24` theo từng time bucket

File:

- PostgreSQL: [`05_pg_distinct_aircraft_by_interval.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/05_pg_distinct_aircraft_by_interval.sql)
- TimescaleDB: [`05_ts_distinct_aircraft_by_interval.sql`](/Users/anle/Documents/Study/UIT/first_year/HK1/csdlnc/project/backend/sql/benchmark/05_ts_distinct_aircraft_by_interval.sql)

Ví dụ:

```bash
psql -h localhost -U postgres -d flight_trajectory_pg_plain \
  -v from_ts='2020-05-04 01:00:00+00' \
  -v to_ts='2020-05-04 02:00:00+00' \
  -v bucket_size='10 minutes' \
  -f sql/benchmark/05_pg_distinct_aircraft_by_interval.sql
```

### Cách so sánh

Mỗi file đều dùng:

- `EXPLAIN (ANALYZE, BUFFERS)`

Bạn nên so sánh:

- `Execution Time`
- số block đọc trong `BUFFERS`
- query plan

Để benchmark công bằng:

- import cùng một dữ liệu vào 2 DB
- giữ cùng index logic
- chạy mỗi query 3-5 lần
- với PostgreSQL thuần, database benchmark là `flight_trajectory_pg_plain`
- với TimescaleDB, kiểm tra trước:

```sql
SELECT * FROM timescaledb_information.hypertables;
```

Nếu `flight_points` chưa xuất hiện ở đây thì chưa phải benchmark TimescaleDB thật.

## QGIS

Sau khi có dữ liệu trong DB, bạn có thể kết nối QGIS trực tiếp tới PostgreSQL và load:

- `flight_points.geom`
- `flight_points.geom_3d`
- `airspace_zones.polygon_geom`
- `flight_events` để xem log sự kiện

## Lưu ý hiện tại

- project đang ưu tiên ingestion từ file, không phải streaming real-time
- `flight_events` chỉ xuất hiện khi bạn có zone data và chạy logic detection
- nếu muốn benchmark PostgreSQL thường và TimescaleDB, nên dùng cùng một CSV import vào 2 DB riêng
