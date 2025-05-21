<template>
  <view class="container">
    <image
      class="logo"
      src="/static/logo.png"
      mode="aspectFit"
      :style="{ aspectRatio: 9.357 }"
    ></image>
    <view class="heartbeat-status">
      <view v-if="heartbeat === false" class="error-banner">
        <text>Backend connection lost. Please check the server.</text>
      </view>
      <view v-else-if="heartbeat === true" class="green-light">
        <text style="color: #4caf50; font-size: 18px">●</text>
        <text> Backend Connected</text>
      </view>
    </view>
    <!-- Upload Section -->
    <view class="upload-section">
      <button @click="handleLocalUpload">Upload Local Excel</button>
      <input type="text" v-model="remoteUrl" placeholder="Enter remote URL" />
      <button @click="handleRemoteUpload">Submit URL</button>
    </view>

    <!-- Task List -->
    <view class="task-list">
      <TaskProgress
        v-if="tasks.length"
        :task="tasks[0]"
        @retryTask="checkTaskStatus"
      />
    </view>
  </view>
</template>

<script>
// If you install the uni-file-picker plugin, import its JS API:
import UniFilePicker from "@/uni_modules/uni-file-picker/components/uni-file-picker/utils.js";
import api from "@/utils/api";
import TaskProgress from "@/components/TaskProgress.vue";

export default {
  components: {
    TaskProgress,
  },
  data() {
    return {
      tasks: [],
      remoteUrl: "",
      pollingIntervals: {},
      heartbeat: true,
    };
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
      if (!this.remoteUrl) return;
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
.container {
  display: flex;
  justify-content: left;
}

.logo {
  /* Base size - set only one dimension */
  width: 200rpx; /* OR height: 200rpx */
  height: auto; /* Maintain aspect ratio */

  /* Aspect ratio control */
  aspect-ratio: 9.357; /* Match with inline style value */
  object-fit: contain;

  /* Responsive constraints */
  max-width: 80%;
  max-height: 30vh;

  /* Styling */
  margin: 40rpx 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 16rpx;
}

/* Optional: Platform-specific tweaks */
/*
@media (platform: ios) {
  .logo {
    margin-top: 60rpx;
  }
}

@media (platform: android) {
  .logo {
    margin-top: 50rpx;
  }
}
*/
</style>
