<template>
  <view class="connection-status" :class="statusClass">
    <view class="status-indicator">
      <text class="status-icon">{{ statusIcon }}</text>
      <text class="status-text">{{ statusText }}</text>
    </view>
    <text v-if="showRetry" class="retry-link" @click="checkHeartbeat"
      >Retry</text
    >
  </view>
</template>

<script>
import api from "@/utils/api";

export default {
  props: {
    interval: {
      type: Number,
      default: 5000, // 5 seconds
    },
  },
  data() {
    return {
      isConnected: false,
      isChecking: false,
      lastCheck: null,
      error: null,
    };
  },
  computed: {
    statusClass() {
      return {
        connected: this.isConnected,
        disconnected: !this.isConnected,
        checking: this.isChecking,
      };
    },
    statusIcon() {
      return this.isConnected ? "●" : "⚠️";
    },
    statusText() {
      if (this.isChecking) return "Checking...";
      return this.isConnected ? "Connected" : "Connection Lost";
    },
    showRetry() {
      return !this.isConnected && !this.isChecking;
    },
  },
  mounted() {
    this.startHeartbeatCheck();
  },
  beforeDestroy() {
    this.stopHeartbeatCheck();
  },
  methods: {
    startHeartbeatCheck() {
      this.checkHeartbeat();
      this.intervalId = setInterval(this.checkHeartbeat, this.interval);
    },
    stopHeartbeatCheck() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },
    async checkHeartbeat() {
      if (this.isChecking) return;

      this.isChecking = true;
      this.error = null;

      try {
        const response = await api.checkHeartbeat();

        if (response.data?.status === "ok") {
          this.isConnected = true;
          this.lastCheck = new Date();
        } else {
          throw new Error("Invalid heartbeat response");
        }
      } catch (error) {
        console.error("Heartbeat check failed:", error);
        this.isConnected = false;
        this.error = error.message || "Connection failed";
        this.$emit("status-change", false);
      } finally {
        this.isChecking = false;
        this.$emit("status-change", this.isConnected);
      }
    },
  },
};
</script>

<style scoped>
.connection-status {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  transition: all 0.3s ease;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.status-icon {
  font-size: 32rpx;
  transition: opacity 0.3s ease;
}

.checking .status-icon {
  animation: pulse 1.5s infinite;
}

.status-text {
  font-size: 28rpx;
  font-weight: 500;
}

.retry-link {
  margin-left: 16rpx;
  color: #2196f3;
  text-decoration: underline;
  cursor: pointer;
  font-size: 26rpx;
}

/* Connected state */
.connected {
  background-color: #e8f5e9;
  color: #4caf50;
}

/* Disconnected state */
.disconnected {
  background-color: #ffebee;
  color: #f44336;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
</style>
