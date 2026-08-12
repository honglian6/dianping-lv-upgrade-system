/**
 * 公共云端存储模块
 * 使用 JSONBin.io 实现自动云端同步，用户无需配置
 */

const PUBLIC_STORAGE_KEY = 'dianping_lv_public_config';

/**
 * 公共云端存储管理器
 */
class PublicCloudStorageManager {
    constructor() {
        // 公共 JSONBin 配置
        this.binId = '6706c3d5ad19e34a353b95d8'; // 公共存储空间
        this.apiKey = '$2a$10$YourApiKey'; // 这个需要替换为实际的 API key
        this.apiURL = `https://api.jsonbin.io/v3/b/${this.binId}`;

        this.isSyncing = false;
        this.syncInterval = null;
        this.listeners = [];
        this.userId = this.getUserId();
    }

    /**
     * 获取用户ID（生成唯一标识）
     */
    getUserId() {
        let userId = localStorage.getItem('dianping_user_id');
        if (!userId) {
            // 生成新的用户ID
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('dianping_user_id', userId);
        }
        return userId;
    }

    /**
     * 初始化
     */
    init() {
        return true; // 公共存储始终可用
    }

    /**
     * 检查是否可用
     */
    isConfigured() {
        return true; // 公共存储始终可用
    }

    /**
     * 从云端下载数据
     */
    async download() {
        this.isSyncing = true;
        this.notifyListeners('downloading');

        try {
            const response = await fetch(this.apiURL + '/latest', {
                headers: {
                    'X-Bin-Meta': 'false'
                }
            });

            if (!response.ok) {
                throw new Error(`下载失败: ${response.status}`);
            }

            const allData = await response.json();

            // 获取当前用户的数据
            const userData = allData.users ? (allData.users[this.userId] || null) : null;

            this.isSyncing = false;
            this.notifyListeners('success');

            return userData || this.getEmptyData();
        } catch (error) {
            // 如果是首次或bin不存在，返回空数据
            this.isSyncing = false;
            this.notifyListeners('success');
            return this.getEmptyData();
        }
    }

    /**
     * 获取空数据结构
     */
    getEmptyData() {
        return {
            formulas: {
                title: [],
                opening: [],
                structure: [],
                highlight: []
            },
            works: [],
            reflections: [],
            styles: {
                review: { title: [], opening: [], content: [], emotion: '' },
                note: { title: [], opening: [], content: [], emotion: '' }
            }
        };
    }

    /**
     * 上传数据到云端
     */
    async upload(localData) {
        this.isSyncing = true;
        this.notifyListeners('uploading');

        try {
            // 先获取现有数据
            let allData;
            try {
                const response = await fetch(this.apiURL + '/latest', {
                    headers: {
                        'X-Bin-Meta': 'false'
                    }
                });
                if (response.ok) {
                    allData = await response.json();
                }
            } catch (e) {
                // 如果获取失败，创建新结构
                allData = { users: {} };
            }

            // 确保结构正确
            if (!allData.users) {
                allData = { users: {} };
            }

            // 更新当前用户的数据
            allData.users[this.userId] = {
                ...localData,
                lastUpdate: new Date().toISOString()
            };

            // 上传更新后的数据
            const updateResponse = await fetch(this.apiURL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey
                },
                body: JSON.stringify(allData)
            });

            if (!updateResponse.ok) {
                throw new Error(`上传失败: ${updateResponse.status}`);
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
     * 同步数据
     */
    async sync() {
        if (this.isSyncing) {
            return;
        }

        try {
            // 获取云端数据
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
                // 合并本地和云端数据
                const merged = this.mergeData(localData, cloudData);
                if (window.saveStorageData) {
                    window.saveStorageData(merged);
                }
                // 刷新界面
                if (window.updateCounts) {
                    window.updateCounts();
                }
                // 上传合并后的数据
                await this.upload(merged);
            }
        } catch (error) {
            console.error('同步失败:', error);
            // 同步失败不影响本地使用
        }
    }

    /**
     * 合并本地和云端数据
     */
    mergeData(local, cloud) {
        const merged = { ...local };

        // 合并公式库 - 按ID去重，保留最新的
        for (const category in (cloud.formulas || {})) {
            if (!merged.formulas[category]) {
                merged.formulas[category] = [];
            }

            const localIds = new Set(merged.formulas[category].map(f => f.id));
            (cloud.formulas[category] || []).forEach(formula => {
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

        return merged;
    }
}

// 创建全局实例
window.cloudStorage = new PublicCloudStorageManager();
