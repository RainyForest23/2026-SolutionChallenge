include .env

IMAGE = $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(REPO_NAME)/$(SERVICE_NAME):$(IMAGE_TAG)

.PHONY: auth setup build push deploy all local logs url teardown clean

auth:
	gcloud auth login
	gcloud config set project $(PROJECT_ID)

setup:
	gcloud services enable run.googleapis.com
	gcloud services enable artifactregistry.googleapis.com
	gcloud artifacts repositories create $(REPO_NAME) \
		--repository-format=docker \
		--location=$(REGION) \
		--description="Docker repository"

build:
	# --platform linux/amd64: Apple Silicon(M1/M2/M3) Mac용. Linux에서는 제거 가능.
	docker build --platform linux/amd64 -t $(IMAGE) .

push:
	gcloud auth configure-docker $(REGION)-docker.pkg.dev --quiet
	docker push $(IMAGE)

deploy:
	gcloud run deploy $(SERVICE_NAME) \
		--image=$(IMAGE) \
		--platform=managed \
		--region=$(REGION) \
		--allow-unauthenticated \
		--memory=128Mi \
		--cpu=1 \
		--max-instances=1

all: build push deploy

local:
	docker build -t $(SERVICE_NAME):local .
	docker run --rm -p 8080:8080 $(SERVICE_NAME):local

logs:
	gcloud run services logs read $(SERVICE_NAME) --region=$(REGION) --limit=50

url:
	@gcloud run services describe $(SERVICE_NAME) --region=$(REGION) --format="value(status.url)"

teardown:
	gcloud run services delete $(SERVICE_NAME) --region=$(REGION) --quiet
	gcloud artifacts docker images delete $(IMAGE) --quiet
	gcloud artifacts repositories delete $(REPO_NAME) --location=$(REGION) --quiet

clean:
	-docker rmi $(IMAGE)
	-docker rmi $(SERVICE_NAME):local
