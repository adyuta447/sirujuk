FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt requirements-train.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-train.txt
COPY app ./app
COPY sirujuk ./sirujuk
COPY train.py .
RUN mkdir -p models && python train.py > models/train_report.json \
 && sha256sum models/sirujuk.joblib | cut -d" " -f1 > models/sirujuk.joblib.sha256 \
 && useradd --system --no-create-home app && chmod -R a-w /app && chmod -R a+rX /app
USER app
CMD ["python", "-m", "app.grpc_server"]
