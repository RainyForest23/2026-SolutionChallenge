from rest_framework import serializers

# POST /api/analyze
class AnalyzeRequestSerializer(serializers.Serializer):
    youtube_url = serializers.URLField(required=False, allow_blank=False)
    upload_id = serializers.CharField(required=False, allow_blank=False) #Used when video was uploaded to Firebase Storage
    callback_url = serializers.URLField(required=False, allow_blank=False)

    # At least one of youtube_url OR upload_id must exist.
    def validate(self, data):
        if not data.get("youtube_url") and not data.get("upload_id"):
            raise serializers.ValidationError("Provide either 'youtube_url' or 'upload_id'.")
        return data

# Response of POST /api/analyze -> 
    # {
    #  "job_id": "abc123",
    #  "status": "queued"
    # }
class AnalyzeResponseSerializer(serializers.Serializer):
    job_id = serializers.CharField()
    status = serializers.CharField()

# GET /api/status
class StatusResponseSerializer(serializers.Serializer):
    job_id = serializers.CharField()
    status = serializers.CharField()
    error = serializers.CharField(allow_null=True, required=False, allow_blank=True)

# {
#   "t_start": 5,
#   "t_end": 10,
#   "emotion": "happy",
#   "intensity": 0.8
# }
class EmotionSegmentSerializer(serializers.Serializer):
    t_start = serializers.FloatField()
    t_end = serializers.FloatField()
    emotion = serializers.CharField()
    intensity = serializers.FloatField()

# Each item in the list must match EmotionSegmentSerializer
# {
#   "emotion_timeline": [ ... segments ... ]
# }
class ResultPayloadSerializer(serializers.Serializer):
    emotion_timeline = serializers.ListSerializer(child=EmotionSegmentSerializer())

# GET /api/result
# wraps into 
    # {
        # "job_id": "abc123",
        # "status": "done",
        # "result": {
        #     "emotion_timeline": [...]
        # }
    # }
class ResultResponseSerializer(serializers.Serializer):
    job_id = serializers.CharField()
    status = serializers.CharField()
    result = ResultPayloadSerializer(required=False, allow_null=True)