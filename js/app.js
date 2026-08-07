/**
 * 内容创作能力提升系统 - 主应用逻辑
 */

// ==================== 应用状态 ====================
const appState = {
    currentType: 'review',       // 当前内容类型（默认写评价）
    currentStep: 1,              // 当前步骤
    currentFormulaCategory: 'title', // 当前公式分类
    currentTypeName: '写评价'      // 当前类型名称
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

/**
 * 初始化应用
 */
function initApp() {
    // 绑定内容类型切换
    document.querySelectorAll('.content-type').forEach(item => {
        item.addEventListener('click', function() {
            switchContentType(this.dataset.type, this.dataset.name);
        });
    });

    // 绑定步骤切换
    document.querySelectorAll('.progress-circle').forEach(circle => {
        circle.addEventListener('click', function() {
            switchStep(parseInt(this.dataset.step));
        });
    });

    // 绑定公式分类选择
    document.querySelectorAll('.formula-category').forEach(item => {
        item.addEventListener('click', function() {
            selectFormulaCategory(this);
        });
    });

    // 绑定AI提取按钮
    document.getElementById('aiExtractBtn').addEventListener('click', aiExtractFormula);

    // 绑定上传方式切换
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchUploadMethod(this.dataset.method);
        });
    });

    // 绑定"我已复制内容"按钮
    document.getElementById('copyFromLinkBtn').addEventListener('click', function(e) {
        e.preventDefault();
        switchUploadMethod('paste');
        showToast('✓ 请粘贴你复制的内容');
    });

    // 绑定保存AI公式按钮
    document.getElementById('saveAiFormulaBtn').addEventListener('click', saveAiFormulas);

    // 绑定编辑按钮
    document.getElementById('editFormulaBtn').addEventListener('click', function() {
        document.getElementById('aiResult').style.display = 'none';
        document.getElementById('manualInput').style.display = 'block';
    });

    // 绑定保存公式按钮
    document.getElementById('saveFormulaBtn').addEventListener('click', saveFormula);

    // 绑定生成内容按钮
    document.getElementById('generateBtn').addEventListener('click', generateContent);

    // 绑定复制按钮
    document.getElementById('copyBtn').addEventListener('click', copyGeneratedContent);

    // 绑定保存作品按钮
    document.getElementById('saveWorkBtn').addEventListener('click', saveWork);

    // 绑定保存反思按钮
    document.getElementById('saveReflectionBtn').addEventListener('click', saveReflection);

    // 绑定记录本点击
    document.querySelectorAll('.notebook').forEach(notebook => {
        notebook.addEventListener('click', function() {
            openNotebook(this.dataset.notebook);
        });
    });

    // 绑定模态框关闭
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('notebookModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    // 更新计数
    updateCounts();
}

/**
 * 切换内容类型
 */
function switchContentType(type, typeName) {
    appState.currentType = type;
    appState.currentTypeName = typeName;

    // 更新类型选择器样式
    document.querySelectorAll('.content-type').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    // 更新所有类型名称显示
    document.querySelectorAll('.type-name').forEach(el => {
        el.textContent = typeName;
    });

    // 重置到第一步
    switchStep(1);
}

/**
 * 切换步骤
 */
function switchStep(step) {
    appState.currentStep = step;

    // 隐藏所有步骤
    document.querySelectorAll('.step-view, .write-form, .reflect-form').forEach(el => {
        el.classList.remove('active');
    });

    // 显示选中步骤
    const stepMap = { 1: '.step-view', 2: '.write-form', 3: '.reflect-form' };
    const activeElement = document.querySelector(stepMap[step]);
    if (activeElement) {
        activeElement.classList.add('active');
    }

    // 更新进度圈状态
    document.querySelectorAll('.progress-circle').forEach(circle => {
        const stepNum = parseInt(circle.dataset.step);
        circle.classList.remove('active', 'completed');
        if (stepNum < step) {
            circle.classList.add('completed');
        } else if (stepNum === step) {
            circle.classList.add('active');
        }
    });

    // 清空输入框
    if (step === 1) {
        document.getElementById('analyzeInput').value = '';
        document.getElementById('formulaContent').value = '';
        document.getElementById('aiResult').style.display = 'none';
        document.getElementById('manualInput').style.display = 'block';
        // 清空AI结果
        document.getElementById('aiTitle').value = '';
        document.getElementById('aiOpening').value = '';
        document.getElementById('aiStructure').value = '';
        document.getElementById('aiHighlight').value = '';
    } else if (step === 2) {
        document.getElementById('venueName').value = '';
        document.getElementById('venueLocation').value = '';
        document.getElementById('experienceKeywords').value = '';
        document.getElementById('generatedContent').style.display = 'none';
    } else if (step === 3) {
        document.getElementById('smoothPart').value = '';
        document.getElementById('improveIdea').value = '';
        document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
}

/**
 * 切换上传方式
 */
function switchUploadMethod(method) {
    // 更新按钮状态
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-method="${method}"]`).classList.add('active');

    // 更新内容显示
    document.querySelectorAll('.method-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${method}Method`).classList.add('active');
}

/**
 * 选择公式分类
 */
function selectFormulaCategory(element) {
    document.querySelectorAll('.formula-category').forEach(item => {
        item.classList.remove('selected');
    });
    element.classList.add('selected');
    appState.currentFormulaCategory = element.dataset.category;
}

/**
 * AI提取公式
 */
async function aiExtractFormula() {
    const content = document.getElementById('analyzeInput').value.trim();

    if (!content) {
        showToast('请先粘贴要分析的内容', 'error');
        return;
    }

    // 检查AI配置
    if (!hasAIConfig()) {
        showToast('请先配置AI API Key', 'error');
        openConfigModal();
        return;
    }

    const btn = document.getElementById('aiExtractBtn');
    btn.disabled = true;
    btn.textContent = '🤖 分析中...';

    try {
        const result = await extractFormula(content, appState.currentType);

        // 填充分析结果
        document.getElementById('aiTitle').value = result.title || '暂无明显特征';
        document.getElementById('aiOpening').value = result.opening || '暂无明显特征';
        document.getElementById('aiStructure').value = result.structure || '暂无明显特征';
        document.getElementById('aiHighlight').value = result.highlight || '暂无明显特征';

        // 显示AI结果
        document.getElementById('aiResult').style.display = 'block';
        document.getElementById('manualInput').style.display = 'none';

        showToast('✓ AI分析完成');
    } catch (error) {
        showToast('AI分析失败：' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🤖 AI一键提取';
    }
}

/**
 * 保存AI提取的公式
 */
function saveAiFormulas() {
    const categories = ['title', 'opening', 'structure', 'highlight'];
    const categoryNames = {
        title: '标题公式',
        opening: '开头套路',
        structure: '结构框架',
        highlight: '亮点技巧'
    };

    let savedCount = 0;

    categories.forEach(category => {
        const content = document.getElementById('ai' + category.charAt(0).toUpperCase() + category.slice(1)).value.trim();
        if (content && content !== '暂无明显特征') {
            saveFormulaToStorage(category, content);
            savedCount++;
        }
    });

    if (savedCount > 0) {
        updateCounts();
        showToast(`✓ 已保存 ${savedCount} 条公式`);

        // 清空输入
        document.getElementById('analyzeInput').value = '';
        document.getElementById('aiResult').style.display = 'none';
        document.getElementById('manualInput').style.display = 'block';

        // 自动跳到下一步
        setTimeout(() => switchStep(2), 500);
    } else {
        showToast('没有可保存的公式', 'error');
    }
}

/**
 * 保存公式
 */
function saveFormula() {
    const content = document.getElementById('formulaContent').value.trim();
    if (!content) {
        showToast('请先输入公式内容', 'error');
        return;
    }

    saveFormulaToStorage(appState.currentFormulaCategory, content);
    updateCounts();
    showToast('✓ 已保存到公式库');

    // 清空输入
    document.getElementById('analyzeInput').value = '';
    document.getElementById('formulaContent').value = '';

    // 自动跳到下一步
    setTimeout(() => switchStep(2), 500);
}

/**
 * 生成内容
 */
function generateContent() {
    const venueName = document.getElementById('venueName').value.trim();
    const location = document.getElementById('venueLocation').value.trim();
    const keywords = document.getElementById('experienceKeywords').value.trim();

    if (!venueName) {
        showToast('请先填写店铺/地点名称', 'error');
        return;
    }

    // 根据不同类型生成内容
    const content = generateContentByType(appState.currentType, venueName, location, keywords);

    document.getElementById('generatedText').textContent = content;
    document.getElementById('generatedContent').style.display = 'block';
}

/**
 * 根据类型生成内容
 */
function generateContentByType(type, venueName, location, keywords) {
    const today = new Date().toLocaleDateString('zh-CN');

    switch (type) {
        case 'review':
            return `⭐⭐⭐⭐⭐ ${venueName}：值得N刷！

【口味】${keywords || '味道不错，值得推荐'}
【环境】环境有特色，适合拍照
【性价比】性价比OK

${location ? `📍 ${location}` : ''}

结论：推荐！值得一试。

#美食 #探店 #大众点评`;

        case 'note':
            return `🔥 终于来拔草了！${venueName}

${location ? `📍 ${location}` : ''}

真的对得起排队！

✅ ${keywords || '体验很不错，推荐来~'}

${location ? `地址：${location}` : ''}

#探店 #美食 #宝藏小店`;

        case 'favorite':
            return `❤️ 已收藏：${venueName}

值得推荐的小店！

${location ? `📍 ${location}` : ''}

✨ 推荐理由：
${keywords || '体验不错，值得再来'}

推荐！`;

        default:
            return `${venueName}\n\n${keywords || ''}`;
    }
}

/**
 * 复制生成的内容
 */
function copyGeneratedContent() {
    const content = document.getElementById('generatedText').textContent;
    navigator.clipboard.writeText(content).then(() => {
        showToast('✓ 已复制到剪贴板');
    }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('✓ 已复制到剪贴板');
    });
}

/**
 * 保存作品
 */
function saveWork() {
    const venueName = document.getElementById('venueName').value.trim();
    const location = document.getElementById('venueLocation').value.trim();
    const keywords = document.getElementById('experienceKeywords').value.trim();
    const content = document.getElementById('generatedText').textContent;

    if (!content) {
        showToast('请先生成内容', 'error');
        return;
    }

    const work = {
        type: appState.currentType,
        venueName: venueName,
        location: location,
        content: content,
        keywords: keywords
    };

    saveWorkToStorage(work);
    updateCounts();
    showToast('✓ 作品已保存');

    // 自动跳到下一步
    setTimeout(() => switchStep(3), 500);
}

/**
 * 保存反思
 */
function saveReflection() {
    const smoothPart = document.getElementById('smoothPart').value.trim();
    const improveIdea = document.getElementById('improveIdea').value.trim();

    if (!smoothPart && !improveIdea) {
        showToast('请至少填写一项反思内容', 'error');
        return;
    }

    // 获取满意的部分
    const satisfiedParts = [];
    document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked').forEach(cb => {
        satisfiedParts.push(cb.value);
    });

    const reflection = {
        type: appState.currentType,
        source: document.getElementById('reflectionSource').value,
        satisfiedParts: satisfiedParts,
        smoothPart: smoothPart,
        improveIdea: improveIdea
    };

    saveReflectionToStorage(reflection);
    updateCounts();
    showToast('✓ 反思已保存');

    // 检查是否达到5次，提示做风格总结
    const reflectionCount = getReflectionsByType(appState.currentType).length;
    if (reflectionCount % 5 === 0) {
        setTimeout(() => {
            alert(`🎉 你已完成 ${reflectionCount} 次${appState.currentTypeName}循环！\n\n可以去看看你的风格总结了！`);
        }, 600);
    }

    // 回到第一步继续循环
    setTimeout(() => switchStep(1), 600);
}

/**
 * 打开记录本
 */
function openNotebook(type) {
    const modal = document.getElementById('notebookModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const tabs = document.getElementById('formulaTabs');

    let content = '';
    let titleText = '';

    switch (type) {
        case 'examples':
            titleText = '📖 优秀案例';
            tabs.style.display = 'none';
            content = renderExamples();
            break;
        case 'formula':
            titleText = '📚 公式库';
            tabs.style.display = 'flex';
            content = renderFormulas('all');
            break;
        case 'works':
            titleText = '📝 作品记录';
            tabs.style.display = 'none';
            content = renderWorks();
            break;
        case 'growth':
            titleText = '🌱 成长日记';
            tabs.style.display = 'none';
            content = renderReflections();
            break;
        case 'style':
            titleText = '🎨 风格总结';
            tabs.style.display = 'none';
            content = renderStyles();
            break;
    }

    title.textContent = titleText;
    body.innerHTML = content;
    modal.classList.add('show');

    // 绑定公式标签切换
    if (type === 'formula') {
        document.querySelectorAll('.formula-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                switchFormulaTab(this.dataset.tab);
            });
        });
    }
}

/**
 * 切换公式标签
 */
function switchFormulaTab(tab) {
    document.querySelectorAll('.formula-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('modalBody').innerHTML = renderFormulas(tab);
}

/**
 * 渲染公式列表
 */
function renderFormulas(tab) {
    const formulas = getFormulasFromStorage(tab);
    const categoryNames = {
        title: '标题公式',
        opening: '开头套路',
        structure: '结构框架',
        highlight: '亮点技巧'
    };

    if (Object.keys(formulas).every(cat => formulas[cat].length === 0)) {
        return '<div class="empty-state"><div class="empty-state-icon">📚</div><p>暂无公式记录</p><p style="font-size:12px;margin-top:8px;">去"看"一篇内容，提取你的第一个公式吧！</p></div>';
    }

    let html = '';
    const categories = tab === 'all' ? ['title', 'opening', 'structure', 'highlight'] : [tab];

    categories.forEach(cat => {
        formulas[cat].forEach(item => {
            const date = new Date(item.createdAt).toLocaleDateString('zh-CN');
            html += `
                <div class="notebook-item">
                    <div class="notebook-item-date">${date} · ${categoryNames[cat]}${item.count > 1 ? `<span class="notebook-item-count">🔥 ${item.count}次</span>` : ''}</div>
                    <div class="notebook-item-content">${item.content}</div>
                </div>
            `;
        });
    });

    return html || '<div class="empty-state"><div class="empty-state-icon">📚</div><p>该分类暂无公式记录</p></div>';
}

/**
 * 渲染作品列表
 */
function renderWorks() {
    const works = getWorksFromStorage();

    if (works.length === 0) {
        return '<div class="empty-state"><div class="empty-state-icon">📝</div><p>暂无作品记录</p><p style="font-size:12px;margin-top:8px;">去"写"一篇内容，记录你的第一篇作品吧！</p></div>';
    }

    const typeNames = { review: '写评价', note: '发笔记', favorite: '标记好去处' };

    return works.reverse().map(work => {
        const date = new Date(work.createdAt).toLocaleDateString('zh-CN');
        return `
            <div class="notebook-item">
                <div class="notebook-item-date">${date} · ${typeNames[work.type] || work.type}</div>
                <div class="notebook-item-content">
                    <strong>${work.venueName || '无标题'}</strong>
                    ${work.location ? ` · ${work.location}` : ''}
                    <br><small style="color:#7f8c8d;margin-top:4px;display:block;">${work.content.substring(0, 50)}...</small>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 渲染反思列表
 */
function renderReflections() {
    const reflections = getReflectionsFromStorage();

    if (reflections.length === 0) {
        return '<div class="empty-state"><div class="empty-state-icon">🌱</div><p>暂无成长日记</p><p style="font-size:12px;margin-top:8px;">完成一次循环后，记录你的第一次反思吧！</p></div>';
    }

    const typeNames = { review: '写评价', note: '发笔记', favorite: '标记好去处' };
    const sourceNames = { self: '自己写的', template: '套用公式', ai: 'AI辅助', other: '其他' };

    return reflections.reverse().map(ref => {
        const date = new Date(ref.createdAt).toLocaleDateString('zh-CN');
        const satisfiedNames = { title: '标题', opening: '开头', middle: '中间', ending: '结尾' };
        const satisfiedText = ref.satisfiedParts.map(p => satisfiedNames[p] || p).join('、');

        return `
            <div class="notebook-item">
                <div class="notebook-item-date">${date} · ${typeNames[ref.type] || ref.type} · ${sourceNames[ref.source] || ref.source}</div>
                <div class="notebook-item-content">
                    ${ref.satisfiedParts.length > 0 ? `<strong>满意：</strong>${satisfiedText}<br>` : ''}
                    ${ref.smoothPart ? `<strong>顺手：</strong>${ref.smoothPart}<br>` : ''}
                    ${ref.improveIdea ? `<strong>改进：</strong>${ref.improveIdea}` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 渲染优秀案例
 */
function renderExamples() {
    const typeNames = {
        review: '⭐ 写评价',
        note: '📔 发笔记',
        favorite: '❤️ 标记好去处'
    };

    let html = '';

    for (const type in EXAMPLES) {
        const example = EXAMPLES[type];
        html += `
            <div class="example-item">
                <div class="example-header">
                    <span class="example-type">${typeNames[type]}</span>
                    <button class="btn btn-small btn-primary" onclick="useExample('${type}')">📋 用这篇分析</button>
                </div>
                <div class="example-title">${example.title}</div>
                <div class="example-content">${example.content.replace(/\n/g, '<br>')}</div>
                <div class="example-analysis">
                    <details>
                        <summary>🤖 AI分析结果</summary>
                        <div class="analysis-details">
                            <p><strong>标题公式：</strong>${example.analysis.title}</p>
                            <p><strong>开头套路：</strong>${example.analysis.opening}</p>
                            <p><strong>结构框架：</strong>${example.analysis.structure}</p>
                            <p><strong>亮点技巧：</strong>${example.analysis.highlight}</p>
                        </div>
                    </details>
                </div>
            </div>
        `;
    }

    return html;
}

/**
 * 使用案例进行分析
 */
function useExample(type) {
    const example = EXAMPLES[type];
    if (!example) return;

    // 关闭模态框
    closeModal();

    // 切换到第一步
    switchStep(1);

    // 填充内容到输入框
    document.getElementById('analyzeInput').value = example.content;

    // 显示提示
    showToast('✓ 案例已加载，点击"AI一键提取"开始分析');
}

/**
 * 渲染风格总结
 */
function renderStyles() {
    const reflections = getReflectionsFromStorage();
    const typeNames = {
        review: { icon: '⭐', name: '写评价' },
        note: { icon: '📔', name: '发笔记' },
        favorite: { icon: '❤️', name: '标记好去处' }
    };

    let html = '';
    for (const type in typeNames) {
        const typeReflections = reflections.filter(r => r.type === type);
        const count = typeReflections.length;

        if (count === 0) {
            html += `
                <div class="notebook-item">
                    <div class="notebook-item-date">${typeNames[type].icon} ${typeNames[type].name}</div>
                    <div class="notebook-item-content" style="color:#95a5a6;">
                        暂无数据，完成更多${typeNames[type].name}后自动生成
                    </div>
                </div>
            `;
        } else {
            // 统计满意的部分
            const satisfiedStats = {};
            typeReflections.forEach(r => {
                r.satisfiedParts.forEach(p => {
                    satisfiedStats[p] = (satisfiedStats[p] || 0) + 1;
                });
            });

            const satisfiedText = Object.entries(satisfiedStats)
                .sort((a, b) => b[1] - a[1])
                .map(([p, c]) => ({ title: p, count: c, ratio: Math.round(c / count * 100) }))
                .map(item => `${item.title}(${item.count}次,${item.ratio}%)`)
                .join('、');

            html += `
                <div class="notebook-item">
                    <div class="notebook-item-date">${typeNames[type].icon} ${typeNames[type].name} · ${count}次循环</div>
                    <div class="notebook-item-content">
                        <strong>满意的部分：</strong>${satisfiedText || '暂无统计'}
                    </div>
                </div>
            `;
        }
    }

    return html || '<div class="empty-state"><div class="empty-state-icon">🎨</div><p>暂无风格数据</p></div>';
}

/**
 * 关闭模态框
 */
function closeModal() {
    document.getElementById('notebookModal').classList.remove('show');
}

/**
 * 更新计数
 */
function updateCounts() {
    document.getElementById('formulaCount').textContent = getFormulaCountFromStorage() + ' 条';
    document.getElementById('worksCount').textContent = getWorksCountFromStorage() + ' 篇';
    document.getElementById('growthCount').textContent = getReflectionsCountFromStorage() + ' 条';
}

/**
 * 显示提示
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#e74c3c' : '#27ae60';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// ==================== Storage辅助函数 ====================

function saveFormulaToStorage(category, content) {
    const data = getData();
    const existing = data.formulas[category].find(f => f.content === content);
    if (existing) {
        existing.count++;
        existing.lastUsed = new Date().toISOString();
    } else {
        data.formulas[category].push({
            id: Date.now(),
            content: content,
            type: category,
            createdAt: new Date().toISOString(),
            count: 1
        });
    }
    saveData(data);
}

function getFormulasFromStorage(tab = null) {
    const data = getData();
    if (tab === 'all' || tab === null) {
        return data.formulas;
    }
    return { [tab]: data.formulas[tab] || [] };
}

function saveWorkToStorage(work) {
    const data = getData();
    data.works.push({
        id: Date.now(),
        ...work,
        createdAt: new Date().toISOString()
    });
    saveData(data);
}

function getWorksFromStorage() {
    return getData().works;
}

function saveReflectionToStorage(reflection) {
    const data = getData();
    data.reflections.push({
        id: Date.now(),
        ...reflection,
        createdAt: new Date().toISOString()
    });
    saveData(data);
}

function getReflectionsFromStorage() {
    return getData().reflections;
}

function getReflectionsByType(type) {
    return getData().reflections.filter(r => r.type === type);
}

function getFormulaCountFromStorage() {
    const data = getData();
    let count = 0;
    for (const cat in data.formulas) {
        count += data.formulas[cat].length;
    }
    return count;
}

function getWorksCountFromStorage() {
    return getData().works.length;
}

function getReflectionsCountFromStorage() {
    return getData().reflections.length;
}
