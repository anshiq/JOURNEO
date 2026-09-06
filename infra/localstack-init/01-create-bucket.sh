#!/bin/bash
awslocal s3 mb s3://journey-files || true
awslocal s3api put-bucket-cors --bucket journey-files --cors-configuration '{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","HEAD"],"AllowedOrigins":["http://localhost:5173","http://localhost:3000"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]}'
awslocal s3api put-bucket-policy --bucket journey-files --policy '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::journey-files/*"]}]}'
