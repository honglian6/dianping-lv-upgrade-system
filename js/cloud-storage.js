/**
 * 云端存储模块
 * 使用 GitHub Gist API 实现跨设备数据同步
 */

const CLOUD_STORAGE_KEY = 'dianping_lv_cloud_config';

/**
 * 云端存储管理器
 */
class CloudStorageManager {
    constructor() {
        this.gistId = null;
        this.fileName = 'dianping-lv-data.json';
        this.isSyncing = false;
        this.syncInterval = null;
        this.listeners = [];
    }

    /**
     * 初始化云端配置
     */
    init() {
        const config = localStorage.getItem(CLOUD_STORAGE_KEY);
        if (config) {
            const parsed = JSON.parse(config);
            this.gistId = parsed.gistId;
            this.token = parsed.token;
            return true;
        }
        return false;
    }

    /**
     * 检查是否已配置
     */
    isConfigured() {
        return !!(this.gistId && this.token);
    }

    /**
     * 设置云端配置
     */
    async setConfig(token, gistId = null) {
        this.token = token;

        if (!gistId) {
            // 创建新的 Gist
            gistId = await this.createGist();
            if (!gistId) {
                throw new Error('创建 Gist 失败');
            }
        }

        this.gistId = gistId;

        // 保存配置到本地
        localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify({
            gistId: this.gistId,
            token: this.token
        }));

        return this.gistId;
    }

    /**
     * 创建新的 Gist
     */
    async createGist() {
        try {
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: '大众点评LV升级系统数据备份',
                    public: false,
                    files: {
                        [this.fileName]: {
                            content: JSON.stringify({ version: '1.0', createdAt: new Date().toISOString() })
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`创建 Gist 失败: ${response.status}`);
            }

            const data = await response.json();
            return data.id;
        } catch (error) {
            console.error('创建 Gist 出错:', error);
            return null;
        }
    }

    /**
     * 从云端下载数据
     */
    async download() {
        if (!this.isConfigured()) {
            throw new Error('云端未配置');
        }

        this.isSyncing = true;
        this.notifyListeners('downloading');

        try {
            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`下载失败: ${response.status}`);
            }

            const data = await response.json();
            const content = data.files[this.fileName]?.content;

            if (!content) {
                throw new Error('云端数据文件不存在');
            }

            this.isSyncing = false;
            this.notifyListeners('success');
            return JSON.parse(content);
        } catch (error) {
            this.isSyncing = false;
            this.notifyListeners('error', error.message);
            throw error;
        }
    }

    /**
     * 上传数据到云端
     */
    async upload(localData) {
        if (!this.isConfigured()) {
            throw new Error('云端未配置');
        }

        this.isSyncing = true;
        this.notifyListeners('uploading');

        try {
            // 获取当前 Gist 信息以获取文件 SHA
            const getResponse = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!getResponse.ok) {
                throw new Error(`获取 Gist 信息失败: ${getResponse.status}`);
            }

            const gistData = await getResponse.json();
            const file = gistData.files[this.fileName];

            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: `大众点评LV升级系统数据备份 - 最后更新: ${new Date().toLocaleString('zh-CN')}`,
                    files: {
                        [this.fileName]: {
                            content: JSON.stringify(localData, null, 2),
                            filename: this.fileName
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`上传失败: ${response.status}`);
            }

            this.isSyncing = false;
            this.notifyListeners('success');
            return true;
        } catch (error) {
            this.isSyncing = false;
            this.notifyListeners('error', error.message);
            throw error;
        }
    }

    /**
     * 清除云端配置
     */
    clearConfig() {
        this.gistId = null;
        this.token = null;
        localStorage.removeItem(CLOUD_STORAGE_KEY);
        this.stopAutoSync();
        this.notifyListeners('cleared');
    }

    /**
     * 启动自动同步
     */
    startAutoSync(intervalMinutes = 5) {
        this.stopAutoSync();
        this.syncInterval = setInterval(() => {
            this.sync();
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * 停止自动同步
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * 添加状态监听器
     */
    onStatusChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * 通知所有监听器
     */
    notifyListeners(status, error = null) {
        this.listeners.forEach(callback => callback(status, error));
    }

    /**
     * 同步数据（合并本地和云端数据）
     */
    async sync() {
        if (!this.isConfigured() || this.isSyncing) {
            return;
        }

        try {
            const cloudData = await this.download();
            const localData = window.getStorageData ? window.getStorageData() : null;

            if (!localData || Object.keys(localData).length === 0) {
                // 没有本地数据，直接使用云端数据
                if (window.saveStorageData) {
                    window.saveStorageData(cloudData);
                }
                // 刷新界面
                if (window.updateCounts) {
                    window.updateCounts();
                }
            } else {
                // 合并策略：保留两边的数据，按时间戳去重
                const merged = this.mergeData(localData, cloudData);
                if (window.saveStorageData) {
                    window.saveStorageData(merged);
                }
                // 刷新界面
                if (window.updateCounts) {
                    window.updateCounts();
                }
                // 将合并后的数据上传到云端，确保两边一致
                await this.upload(merged);
            }
        } catch (error) {
            console.error('同步失败:', error);
            throw error;
        }
    }

    /**
     * 合并本地和云端数据
     */
    mergeData(local, cloud) {
        const merged = { ...local };

        // 合并公式库
        for (const category in cloud.formulas || {}) {
            if (!merged.formulas[category]) {
                merged.formulas[category] = [];
            }

            const localIds = new Set(merged.formulas[category].map(f => f.id));
            cloud.formulas[category].forEach(formula => {
                if (!localIds.has(formula.id)) {
                    merged.formulas[category].push(formula);
                }
            });
        }

        // 合并作品 - 按 ID 去重，保留最新的
        const workMap = new Map();
        [...(local.works || []), ...(cloud.works || [])].forEach(work => {
            const existing = workMap.get(work.id);
            if (!existing || new Date(work.createdAt) > new Date(existing.createdAt)) {
                workMap.set(work.id, work);
            }
        });
        merged.works = Array.from(workMap.values()).sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        // 合并反思
        const reflectionMap = new Map();
        [...(local.reflections || []), ...(cloud.reflections || [])].forEach(ref => {
            const existing = reflectionMap.get(ref.id);
            if (!existing || new Date(ref.createdAt) > new Date(existing.createdAt)) {
                reflectionMap.set(ref.id, ref);
            }
        });
        merged.reflections = Array.from(reflectionMap.values()).sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        // 合并风格总结
        if (cloud.styles) {
            merged.styles = { ...merged.styles, ...cloud.styles };
        }

        return merged;
    }
}

// 创建全局实例
window.cloudStorage = new CloudStorageManager();
