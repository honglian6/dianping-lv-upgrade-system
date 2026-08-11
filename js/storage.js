/**
 * 数据存储模块
 * 负责localStorage的数据读写操作
 */

const STORAGE_KEY = 'lvUpgradeSystem';

/**
 * 初始化数据结构
 */
function initStorage() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        const initialData = {
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    }
}

/**
 * 获取所有数据
 */
function getData() {
    initStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

/**
 * 保存所有数据
 */
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 保存公式到公式库
 */
function saveFormula(category, content, contentType = 'review') {
    const data = getData();
    const formula = {
        id: Date.now(),
        content: content,
        type: category,
        contentType: contentType,
        createdAt: new Date().toISOString(),
        count: 1
    };

    // 检查是否已存在相同内容
    const existing = data.formulas[category].find(f => f.content === content && f.contentType === contentType);
    if (existing) {
        existing.count++;
        existing.lastUsed = new Date().toISOString();
    } else {
        data.formulas[category].push(formula);
    }

    saveData(data);
    return formula;
}

/**
 * 获取公式库数据
 */
function getFormulas(category = null) {
    const data = getData();
    if (category) {
        return data.formulas[category] || [];
    }
    return data.formulas;
}

/**
 * 获取公式总数
 */
function getFormulaCount() {
    const data = getData();
    let count = 0;
    for (const category in data.formulas) {
        count += data.formulas[category].length;
    }
    return count;
}

/**
 * 保存作品
 */
function saveWork(work) {
    const data = getData();
    const newWork = {
        id: Date.now(),
        type: work.type,
        content: work.content,
        // 评价特有的字段
        experience: work.experience || null,
        requirements: work.requirements || null,
        link: work.link || null,
        // 笔记特有的字段
        baseReview: work.baseReview || null,
        baseReviewId: work.baseReviewId || null,
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        favorites: 0,
        rating: null
    };
    data.works.push(newWork);
    saveData(data);
    return newWork;
}

/**
 * 获取作品列表
 */
function getWorks(type = null) {
    const data = getData();
    if (type) {
        return data.works.filter(w => w.type === type);
    }
    return data.works;
}

/**
 * 获取作品总数
 */
function getWorksCount() {
    return getData().works.length;
}

/**
 * 保存反思
 */
function saveReflection(reflection) {
    const data = getData();
    const newReflection = {
        id: Date.now(),
        type: reflection.type,
        satisfiedParts: reflection.satisfiedParts,
        smoothPart: reflection.smoothPart,
        improveIdea: reflection.improveIdea,
        createdAt: new Date().toISOString()
    };
    data.reflections.push(newReflection);
    saveData(data);
    return newReflection;
}

/**
 * 获取反思列表
 */
function getReflections(type = null) {
    const data = getData();
    if (type) {
        return data.reflections.filter(r => r.type === type);
    }
    return data.reflections;
}

/**
 * 获取反思总数
 */
function getReflectionsCount() {
    return getData().reflections.length;
}

/**
 * 导出数据
 */
function exportData() {
    const data = getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `内容创作能力提升系统_备份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 导入数据
 */
function importData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.formulas && data.works && data.reflections) {
            saveData(data);
            return true;
        }
        return false;
    } catch (e) {
        console.error('导入数据失败:', e);
        return false;
    }
}

/**
 * 清空所有数据
 */
function clearAllData() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        localStorage.removeItem(STORAGE_KEY);
        initStorage();
        return true;
    }
    return false;
}

// 初始化存储
initStorage();
