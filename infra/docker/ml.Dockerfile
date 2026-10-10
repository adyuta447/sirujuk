FROM python:3.12-slim
WORKDIR /app
COPY ml-service/requirements.txt ml-service/requirements-train.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-train.txt
COPY ml-service/app ./app
COPY ml-service/train.py .
RUN mkdir -p models && python train.py > models/train_report.json
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
