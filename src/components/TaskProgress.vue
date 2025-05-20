<template>
  <view :class="['task-item', statusClass]">
    <view class="task-header">
      <text>{{ task.filename }}</text>
      <text :class="['status-badge', statusClass]">{{ task.status }}</text>
    </view>

    <view class="progress-container">
      <!-- force full rerender on percent change -->
      <progress :key="task.progress" :percent="task.progress" />
      <text>{{ task.progress }}%</text>
    </view>

    <view v-if="task.error" class="error-message">
      {{ task.error }}
    </view>

    <button
      v-if="task.status === 'SUCCESS'"
      @click="handleDownload"
      class="download-btn"
    >
      Download Result
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
        }[this.task.status] || "pending"
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
        console.error(err);
        uni.showToast({ title: "Download failed", icon: "none" });
      }
    },
  },
};
</script>

<style scoped>
.success {
  background-color: #e8f5e9;
}
.error {
  background-color: #ffebee;
}
.processing {
  background-color: #fff3e0;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
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

.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
