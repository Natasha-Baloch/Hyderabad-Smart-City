-- OPTIONAL demo seed. Run manually only on a development project.
-- Coordinates are APPROXIMATE placements, names are placeholders: verification = 'sample'. Not official data.
insert into public.city_areas (name, center_lat, center_lng, verification, source) values
 ('Latifabad',25.37,68.37,'sample','demo'),('Qasimabad',25.405,68.325,'sample','demo'),
 ('Hyderabad City',25.392,68.365,'sample','demo'),('Near Kotri bridge',25.38,68.33,'sample','demo') on conflict do nothing;
insert into public.city_assets (name, category, asset_type, lat, lng, operational_status, data_source, verification) values
 ('Sample School A','education','Educational Institution',25.398,68.366,'Operational','demo','sample'),
 ('Sample Hospital C','healthcare','Healthcare Facility',25.389,68.372,'Operational','demo','sample'),
 ('Sample Water Plant E','water','Water Infrastructure',25.383,68.338,'Operational','demo','sample'),
 ('Sample Arterial Road G','roads','Road Segment',25.402,68.357,'Operational','demo','sample');
