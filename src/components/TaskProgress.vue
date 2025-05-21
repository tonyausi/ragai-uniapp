<template>
  <view :class="['task-item', statusClass]">
    <view class="task-header">
      <text class="filename">{{ task.filename }}</text>
      <view class="status-container">
        <text :class="['status-badge', statusClass]">{{ task.status }}</text>
        <text v-if="task.processed_at" class="timestamp">
          {{ formatDate(task.processed_at) }}
        </text>
      </view>
    </view>

    <view
      class="progress-container"
      v-if="task.status === 'PROCESSING' || task.status === 'SUCCESS'"
    >
      <!-- Add status to the key to force re-render -->
      <progress
        :key="`${task.progress}-${task.status}`"
        :percent="task.status === 'SUCCESS' ? 100 : task.progress"
      />
      <text>{{ task.status === "SUCCESS" ? 100 : task.progress }}%</text>
    </view>

    <!-- Error Message Section -->
    <view v-if="task.status === 'FAILURE'" class="error-section">
      <text class="error-icon">⚠️</text>
      <view class="error-content">
        <text class="error-title">Processing Error</text>
        <text class="error-message">{{
          task.error || "Unknown error occurred"
        }}</text>
      </view>
    </view>

    <!-- Download Section -->
    <view v-if="task.status === 'SUCCESS'" class="download-section">
      <button class="download-btn" @click="handleDownload">
        <text class="download-icon">⬇️</text>
        Download Result
      </button>
      <text v-if="task.download_path" class="file-size">
        {{ formatFileSize(task.file_size) }}
      </text>
    </view>

    <button
      v-if="task.status === 'FAILURE'"
      class="retry-btn"
      @click="$emit('retryTask', task.task_id)"
    >
      Retry Task
    </button>
  </view>
</template>

<script>
import { APP_PLATFORM } from "@/config/config";
import api from "@/utils/api";
export default {
  props: {
    task: Object,
  },
  computed: {
    statusClass() {
      //console.log("In TaskProgress,this.task.status=", this.task.status);
      console.log("In TaskProgress,this.task=", JSON.stringify(this.task));
      return (
        {
          SUCCESS: "success",
          FAILURE: "error",
          ERROR: "error",
          PROCESSING: "processing",
        }[this.task.status] || "processing"
      );
    },
  },
  methods: {
    async handleDownload() {
      try {
        if (APP_PLATFORM === "h5") {
          await api.downloadH5(this.task.task_id);
        } else if (typeof plus !== "undefined") {
          await api.downloadAppPlus(this.task.task_id);
        } else {
          await api.downloadMiniProgram(this.task.task_id);
        }
        uni.showToast({ title: "Download complete", icon: "success" });
      } catch (err) {
        console.error("Download failed:", err);
        uni.showToast({ title: "Download failed", icon: "none" });
      }
    },

    formatDate(timestamp) {
      // If timestamp is empty, return the current time
      const date = timestamp ? new Date(timestamp) : new Date();
      return date.toLocaleString();
    },

    formatFileSize(bytes) {
      // Add file size formatting logic
      if (!bytes) return "";
      const units = ["B", "KB", "MB", "GB"];
      let size = bytes;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return `${size.toFixed(1)} ${units[unitIndex]}`;
    },
  },
};
</script>

<style scoped>
/* Status Colors */
.success {
  background-color: #e8f5e9;
  border-left: 4px solid #4caf50;
}

.error {
  background-color: #ffebee;
  border-left: 4px solid #f44336;
}

.processing {
  background-color: #fff3e0;
  border-left: 4px solid #ffc107;
}

/* Task Header */
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.filename {
  font-weight: 500;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: white;

  &.success {
    background-color: #4caf50;
  }

  &.error {
    background-color: #f44336;
  }

  &.processing {
    background-color: #ffc107;
  }
}

.timestamp {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

/* Error Section */
.error-section {
  display: flex;
  align-items: flex-start;
  margin: 12px 0;
  padding: 12px;
  background-color: #fff;
  border-radius: 4px;
}

.error-icon {
  font-size: 20px;
  margin-right: 8px;
}

.error-content {
  flex: 1;
}

.error-title {
  font-weight: 500;
  color: #f44336;
  margin-bottom: 4px;
}

.error-message {
  color: #666;
  font-size: 14px;
}

/* Download Section */
.download-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.download-btn {
  background-color: #4caf50;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.download-icon {
  margin-right: 8px;
}

.file-size {
  color: #666;
  font-size: 14px;
}

/* Retry Button */
.retry-btn {
  background-color: #f44336;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  margin-top: 12px;
}

/* Progress Bar */
progress {
  width: 100%;
  height: 8px;
  border-radius: 4px;
}

.progress-text {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

/* completion animation */
progress[percent="100"] {
  transition: all 0.5s ease;
  background-color: #4caf50 !important;
}

progress[percent="100"]::-webkit-progress-value {
  transition: all 0.5s ease;
  background-color: #4caf50;
}
</style>
