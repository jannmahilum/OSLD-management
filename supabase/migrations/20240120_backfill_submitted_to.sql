UPDATE submissions SET submitted_to = 'LCO' WHERE organization NOT IN ('LCO', 'USG', 'GSC', 'USED', 'TGP', 'LSG') AND submitted_to IS NULL;
UPDATE submissions SET submitted_to = 'USG' WHERE organization = 'LSG' AND submitted_to IS NULL;
UPDATE submissions SET submitted_to = 'OSLD' WHERE organization IN ('LCO', 'USG', 'GSC', 'USED', 'TGP') AND submitted_to IS NULL;
