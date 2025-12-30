import boto3

class CognitoClient:
    def __init__(self):
        self.client = boto3.client(
            "cognito-idp",
            region_name="eu-north-1"
        )

cognito_client = CognitoClient()
