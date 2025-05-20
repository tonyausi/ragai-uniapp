import { API_BASE } from "@/config/config";

export default {
  async checkHeartbeat() {
    return uni.request({
      url: `${API_BASE}/ragflowai/heartbeat`,
      method: "GET",
    });
  },

  async uploadFile(file, isRemote = false) {
    const formData = new FormData();
    if (!isRemote) {
      formData.append("file", file);
    } else {
      formData.append("url", file);
    }
    // console.log("upload api url = ", `${API_BASE}/ragflowai/upload`);
    const filePath = file.path || file.tempFilePath || file.filePath;
    //const fileName =
    //  file.name || (filePath ? filePath.split("/").pop() : "file");
    console.log("filePath = ", filePath);
    //console.log("fileName = ", fileName);
    try {
      return await uni.uploadFile({
        url: `${API_BASE}/ragflowai/upload`,
        filePath: filePath,
        name: "file",
        formData: isRemote ? { url: file } : undefined,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  },

  async getTaskStatus(taskId) {
    return uni.request({
      url: `${API_BASE}/ragflowai/status/${taskId}`,
      method: "GET",
    });
  },

  getFilenameFromDisposition(disposition) {
    const match =
      /filename\*=UTF-8''(.+)$/.exec(disposition) ||
      /filename=\"?([^\";]+)\"?/.exec(disposition);
    return match ? decodeURIComponent(match[1]) : "nonamefrombackenddownload";
  },

  // H5 download handler
  async downloadH5(taskId) {
    try {
      // 1. get bytes
      const { data, header } = await uni.request({
        url: `${API_BASE}/ragflowai/download/${taskId}`,
        responseType: "arraybuffer",
        method: "GET",
      });
      // 2. Derive filename
      //console.log("header = ", header);
      const disposition =
        header["Content-Disposition"] || header["content-disposition"];
      //console.log("disposition = ", disposition);
      const filename = this.getFilenameFromDisposition(disposition);
      console.log("Download filename = ", filename);
      // 3. blob + URL
      const blob = new Blob([data], { type: header["Content-Type"] });
      const url = URL.createObjectURL(blob);
      //console.log("Download blob URL = ", url);
      // 4. anchor click
      const a = document.createElement("a");
      a.href = url;
      a.download = filename; // use server‑side filename
      document.body.appendChild(a);
      a.click();
      a.remove();
      // 4. cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100); // ensure click dispatched :contentReference[oaicite:11]{index=11}
      // 7. Notify user
      uni.showToast({
        title: `Downloaded: ${filename}`, // show file name :contentReference[oaicite:12]{index=12}
        icon: "success",
        duration: 3000,
      });
    } catch (err) {
      console.error("downloadH5 failed:", err);
      uni.showToast({
        title: "Download failed",
        icon: "none",
        duration: 2000,
      });
    }
  },

  // in downloadAppPlus.js
  async downloadAppPlus(taskId) {
    // 1. Download to temp
    const { tempFilePath, statusCode } = await new Promise(
      (resolve, reject) => {
        uni.downloadFile({
          url: `${API_BASE}/ragflowai/download/${taskId}`,
          success: (res) =>
            res.statusCode === 200
              ? resolve(res)
              : reject(new Error("Download failed: " + res.statusCode)),
          fail: (err) => reject(err),
        });
      }
    );

    // 2. Save permanently
    const { savedFilePath } = await new Promise((resolve, reject) => {
      let path = tempFilePath;
      if (uni.getSystemInfoSync().platform === "ios") {
        path = encodeURI(path);
      }
      uni.saveFile({
        tempFilePath: path,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });

    // 3. Open document
    await new Promise((resolve, reject) => {
      uni.openDocument({
        filePath: savedFilePath,
        showMenu: true,
        success: () => resolve(),
        fail: (err) => reject(err),
      });
    });
  },

  // in downloadMiniProgram.js
  async downloadMiniProgram(taskId) {
    const { tempFilePath, statusCode } = await new Promise(
      (resolve, reject) => {
        uni.downloadFile({
          url: `${API_BASE}/ragflowai/download/${taskId}`,
          success: (res) =>
            res.statusCode === 200
              ? resolve(res)
              : reject(new Error("Download failed: " + res.statusCode)),
          fail: (err) => reject(err),
        });
      }
    );

    await new Promise((resolve, reject) => {
      uni.openDocument({
        filePath: tempFilePath,
        showMenu: true,
        success: () => resolve(),
        fail: (err) => reject(err),
      });
    });
  },
};
