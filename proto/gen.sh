#!/usr/bin/env sh
# Regenerates the gRPC code from proto/. Needs protoc, protoc-gen-go, protoc-gen-go-grpc and grpcio-tools
# (the grpcio-tools version must match grpcio in ml-service/requirements.txt).
set -eu
cd "$(dirname "$0")/.."
protoc -I proto \
  --go_out=backend-go --go_opt=module=github.com/sirujuk/backend-go \
  --go-grpc_out=backend-go --go-grpc_opt=module=github.com/sirujuk/backend-go \
  proto/sirujuk/ml/v1/inference.proto
python -m grpc_tools.protoc -I proto --python_out=ml-service --grpc_python_out=ml-service proto/sirujuk/ml/v1/inference.proto
