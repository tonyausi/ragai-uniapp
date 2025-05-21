<template>
  <view class="container">
    <!-- Header Section -->
    <header class="header">
      <image
        class="logo"
        src="/static/logo.png"
        mode="aspectFit"
        :style="{ aspectRatio: 9.357 }"
      />
      <connection-status class="status-indicator" />
    </header>

    <!-- Main Content -->
    <main class="content">
      <!-- Upload Section -->
      <section class="upload-card">
        <h2 class="section-title">File Upload</h2>
        <view class="upload-options">
          <button class="upload-button primary" @click="handleLocalUpload">
            <text class="button-icon">📁</text>
            Upload Local File
          </button>
          <view class="remote-upload-group">
            <input
              class="url-input"
              v-model="remoteUrl"
              placeholder="Enter remote URL"
              @keyup.enter="handleRemoteUpload"
            />
            <button class="upload-button secondary" @click="handleRemoteUpload">
              Submit URL
            </button>
          </view>
        </view>
      </section>

      <!-- Task List Section -->
      <section class="tasks-section">
        <h2 class="section-title">Task History</h2>
        <view class="task-list">
          <TaskProgress
            v-for="task in allTasks"
            :key="task.task_id"
            :task="task"
            @retryTask="checkTaskStatus"
          />
          <view v-if="!allTasks.length" class="empty-state">
            <text class="empty-text">No tasks available</text>
          </view>
        </view>
      </section>
    </main>
  </view>
</template>

<script>
// If you install the uni-file-picker plugin, import its JS API:
import UniFilePicker from "@/uni_modules/uni-file-picker/components/uni-file-picker/utils.js";
import api from "@/utils/api";
import TaskProgress from "@/components/TaskProgress.vue";
import ConnectionStatus from "@/components/ConnectionStatus.vue";

export default {
  components: {
    TaskProgress,
    ConnectionStatus,
  },
  data() {
    return {
      tasks: [],
      remoteUrl: "",
      pollingIntervals: {},
    };
  },
  computed: {
    allTasks() {
      return this.tasks; // Now showing all tasks regardless of status
    },
    activeTasks() {
      return this.tasks.filter(
        (task) => !["SUCCESS", "FAILURE"].includes(task.status)
      );
    },
  },
  methods: {
    async handleLocalUpload() {
      let file;

      // 1. Native App runtime
      if (typeof plus !== "undefined") {
        try {
          // Using the uni-file-picker plugin API
          const res = await UniFilePicker.pick({
            multiple: false,
            filter: ["xlsx", "xls", "pdf", "doc", "docx"],
          });
          // plugin returns an array of file objects
          file = res.files[0];
        } catch (err) {
          console.error("Native file pick failed:", err);
          return uni.showToast({ title: "File pick failed", icon: "none" });
        }

        // 2. Fallback to H5
      } else {
        try {
          const res = await uni.chooseFile({
            count: 1,
            extension: [".xlsx", ".xls"],
          });
          file = res.tempFiles[0];
        } catch (err) {
          console.error("H5 file pick failed:", err);
          return uni.showToast({ title: "File pick failed", icon: "none" });
        }
      }

      console.log("Selected file:", file);
      this.startUpload(file);
    },

    async handleRemoteUpload() {
      if (!this.remoteUrl) {
        uni.showToast({ title: "Please enter a URL", icon: "none" });
        return;
      }
      this.startUpload(this.remoteUrl, true);
    },

    async startUpload(file, isRemote = false) {
      try {
        //console.log('begin to upload file');
        const res = await api.uploadFile(file, isRemote);

        // Raise error if status is not 200 and there is no data
        if (
          (res.status !== 200 || !res.data) &&
          (!res.data || Object.keys(res.data).length === 0)
        ) {
          throw new Error(
            "Upload failed: No data returned and status is not 200"
          );
        }

        let resdata = res.data;
        if (typeof resdata === "string") {
          try {
            resdata = JSON.parse(resdata);
          } catch (e) {
            console.error("Failed to parse response data:", e);
            throw e;
          }
        }
        //console.log("upload file to backend with res: ", res);

        console.log("resdata.task_id: ", resdata.task_id);
        const task = {
          task_id: resdata.task_id,
          filename: file.name || this.remoteUrl,
          status: "PENDING",
          progress: 0,
        };
        if (!this.tasks.some((t) => t.task_id === task.task_id)) {
          this.tasks.unshift(task);
        } else {
          console.info(`Task with ID ${task.task_id} already exists.`);
        }
        console.log("Received the backend task.task_id=", task.task_id);
        this.startPolling(task.task_id);
      } catch (error) {
        //TODO: need to show error message in the UI
        //Upload failed: {errMsg: "uploadFile:fail timeout"}
        uni.showToast({ title: "Upload failed", icon: "none" });
      }
    },

    startPolling(taskId) {
      this.pollingIntervals[taskId] = setInterval(async () => {
        await this.checkTaskStatus(taskId);
      }, 4000);
    },

    async checkTaskStatus(taskId) {
      try {
        //console.log("Checking task status for taskId:", taskId);
        const res = await api.getTaskStatus(taskId);
        console.log("Checking task status response:", res);
        const task = this.tasks.find((t) => t.task_id === taskId);

        // Mutate the same object; Vue will pick up the changes
        Object.assign(task, {
          filename: res.data.filename,
          status: res.data.status,
          progress: res.data.progress,
          download_path: res.data.download_path,
          error: res.data.error,
          processed_at: res.data.processed_at,
        });

        console.log("Task status:", res.data.status);
        console.log("Task progress:", res.data.progress);
        if (["SUCCESS", "FAILURE", "ERROR"].includes(res.data.status)) {
          this.$nextTick(() => {
            clearInterval(this.pollingIntervals[taskId]);
            delete this.pollingIntervals[taskId];
          });
        }
      } catch (error) {
        // TODO: need to handle Polling error: {errMsg: "request:fail timeout"}

        console.error("Polling error:", error);
      }
    },
  },
};
</script>

<style scoped>
/* Previous styles remain unchanged */
.container {
  padding: 32rpx;
  max-width: 1200rpx;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f8f9fa;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;
}

.logo {
  width: 300rpx;
  height: auto;
  aspect-ratio: 9.357;
  object-fit: contain;
  filter: drop-shadow(0 4rpx 8rpx rgba(0, 0, 0, 0.1));
}

.status-indicator {
  flex-shrink: 0;
}

.content {
  display: grid;
  gap: 48rpx;
}

.upload-card {
  padding: 32rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 24rpx;
}

.upload-options {
  display: grid;
  gap: 24rpx;
}

.remote-upload-group {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.url-input {
  flex: 1;
  padding: 16rpx 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  transition: border-color 0.3s ease;
}

.url-input:focus {
  border-color: #2196f3;
  outline: none;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: 500;
  transition: all 0.2s ease;
}

.upload-button.primary {
  background: #2196f3;
  color: white;
}

.upload-button.primary:active {
  background: #1976d2;
}

.upload-button.secondary {
  background: #e3f2fd;
  color: #2196f3;
}

.upload-button.secondary:active {
  background: #bbdefb;
}

.button-icon {
  font-size: 32rpx;
}

.tasks-section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
}

.task-list {
  display: grid;
  gap: 24rpx;
}

.empty-state {
  text-align: center;
  padding: 48rpx;
  color: #95a5a6;
}

.empty-text {
  font-size: 28rpx;
}

/* Platform-specific adjustments */
@media (platform: ios) {
  .header {
    padding-top: env(safe-area-inset-top);
  }
}

@media (min-width: 768px) {
  .container {
    padding: 48rpx;
  }

  .upload-options {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
