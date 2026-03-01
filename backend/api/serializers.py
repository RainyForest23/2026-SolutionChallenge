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

# ---- 2-Track Result Schema ----
# {
#   "job_id": "abc123",
#   "status": "done",
#   "result": {
#     "timeline": [
#       {
#         "t_start": 0.0,
#         "t_end": 10.0,
#         "base_mood": { "label": "tension", "intensity": 0.75 },
#         "dynamic_event": { "label": "swell", "intensity": 0.60 },
#         "confidence": 0.92
#       }
#     ]
#   }
# }
class BaseMoodSerializer(serializers.Serializer):
    # e.g. tension, sorrow, uplift, warmth, unknown
    label = serializers.CharField()
    # 0.0 ~ 1.0
    intensity = serializers.FloatField(min_value=0.0, max_value=1.0)
class DynamicEventSerializer(serializers.Serializer):
    # e.g. stable, jump_scare, swell, sudden_drop
    label = serializers.CharField()
    # 0.0 ~ 1.0
    intensity = serializers.FloatField(min_value=0.0, max_value=1.0, required=False, default=0.0)
class TimelineSegment2TrackSerializer(serializers.Serializer):
    t_start = serializers.FloatField()
    t_end = serializers.FloatField()
    base_mood = BaseMoodSerializer()
    dynamic_event = DynamicEventSerializer()
    confidence = serializers.FloatField(min_value=0.0, max_value=1.0, required=False)
class ResultPayloadSerializer(serializers.Serializer):
    timeline = serializers.ListSerializer(child=TimelineSegment2TrackSerializer())

# GET /api/result
class ResultResponseSerializer(serializers.Serializer):
    job_id = serializers.CharField()
    status = serializers.CharField()
    result = ResultPayloadSerializer(required=False, allow_null=True)