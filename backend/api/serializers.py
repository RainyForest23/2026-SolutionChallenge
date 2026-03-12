from rest_framework import serializers

# POST /api/analyze
class AnalyzeRequestSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True)
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
    video_id = serializers.CharField(required=False)
    status = serializers.CharField()

# GET /api/status
class StatusResponseSerializer(serializers.Serializer):
    job_id = serializers.CharField()
    video_id = serializers.CharField(required=False)
    status = serializers.CharField()
    error = serializers.CharField(allow_null=True, required=False, allow_blank=True)

# ---- 2-Track Result Schema ----
# {
#   "job_id": "abc123",
#   "video_id": "video456",
#   "status": "done",
#   "result": {
#     "videoUrl": "https://...",
#     "base_moods": [
#       {
#         "label": "tension",
#         "intensity": 0.75,
#         "start": 0.0,
#         "end": 10.0
#       }
#     ],
#     "events": [
#       {
#         "type": "swell",
#         "trigger_time": 4.2,
#         "duration": 2.5,
#         "strength": 0.60
#       }
#     ]
#   }
# }
class BaseMoodSerializer(serializers.Serializer):
    # e.g. tension, sorrow, uplift, warmth, unknown
    label = serializers.CharField()
    # 0.0 ~ 1.0
    intensity = serializers.FloatField(min_value=0.0, max_value=1.0)
    start = serializers.FloatField()
    end = serializers.FloatField()
class DynamicEventSerializer(serializers.Serializer):
    # e.g. stable, jump_scare, swell, sudden_drop
    type = serializers.CharField()
    trigger_time = serializers.FloatField()
    duration = serializers.FloatField()
    # 0.0 ~ 1.0
    strength = serializers.FloatField(min_value=0.0, max_value=1.0)
class ResultPayloadSerializer(serializers.Serializer):
    videoUrl = serializers.CharField()
    base_moods = BaseMoodSerializer(many=True)
    events = DynamicEventSerializer(many=True)

# GET /api/result
class ResultResponseSerializer(serializers.Serializer):
    job_id = serializers.CharField()
    video_id = serializers.CharField(required=False)
    status = serializers.CharField()
    result = serializers.JSONField(required=False, allow_null=True)