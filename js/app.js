/**
 * 大众点评LV升级系统 - 主应用逻辑
 */

// ==================== 应用状态 ====================
const appState = {
    currentType: null,        // 当前内容类型（review/note）
    currentStep: 1,           // 当前步骤
    currentFormulaCategory: 'title', // 当前公式分类
    currentTypeName: ''       // 当前类型名称
};

// 存储确认的评价内容，用于生成笔记
let confirmedReview = null;
// 存储选中的评价记录ID
let selectedReviewId = null;

/**
 * 处理进度圈点击（全局函数，供HTML调用）
 */
function handleProgressClick(step) {
    const type = appState.currentType;
    if (type && !isNaN(step)) {
        switchStep(type, step);
    }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

/**
 * 初始化应用
 */
function initApp() {
    // 初始化云端同步
    initCloudSync();

    // 绑定内容类型切换
    document.querySelectorAll('.content-type').forEach(item => {
        item.addEventListener('click', function() {
            selectContentType(this.dataset.type, this.dataset.name);
        });
    });

    // 使用事件委托绑定所有动态元素的事件
    document.getElementById('workspace').addEventListener('click', function(e) {
        const target = e.target;

        // 进度圈点击（步骤切换）
        const circle = target.closest('.progress-circle');
        if (circle) {
            const step = parseInt(circle.dataset.step);
            const type = appState.currentType;
            if (type && !isNaN(step)) {
                switchStep(type, step);
            }
            return;
        }

        // 公式分类选择
        if (target.classList.contains('formula-category')) {
            selectFormulaCategory(target);
            return;
        }

        // 上传方式切换
        if (target.classList.contains('method-btn')) {
            if (target.dataset.method) {
                const module = target.closest('.type-module');
                const type = module && module.id === 'reviewModule' ? 'review' : 'note';
                if (type) {
                    switchUploadMethod(type, target.dataset.method);
                }
                return;
            }
            if (target.dataset.input) {
                switchInputMethod(target.dataset.input);
                return;
            }
        }
    });

    // 绑定其他按钮事件（这些元素ID是唯一的）
    bindCommonEvents();

    // 更新计数
    updateCounts();
}

/**
 * 绑定通用事件
 */
function bindCommonEvents() {
    // 绑定"我已复制内容"按钮（写评价）
    document.getElementById('copyFromLinkBtn').addEventListener('click', function(e) {
        e.preventDefault();
        switchUploadMethod('review', 'paste');
        showToast('✓ 请粘贴你复制的内容');
    });

    // 绑定AI提取按钮（写评价）
    document.getElementById('aiExtractBtn').addEventListener('click', () => aiExtractFormula('review'));

    // 绑定编辑按钮（写评价）
    document.getElementById('editFormulaBtn').addEventListener('click', function() {
        document.getElementById('aiResult').style.display = 'none';
        document.getElementById('manualInput').style.display = 'block';
    });

    // 绑定保存AI公式按钮（写评价）
    document.getElementById('saveAiFormulaBtn').addEventListener('click', () => saveAiFormulas('review'));

    // 绑定保存公式按钮（写评价）
    document.getElementById('saveFormulaBtn').addEventListener('click', () => saveFormula('review'));

    // 绑定生成评价按钮
    document.getElementById('generateReviewBtn').addEventListener('click', generateReview);

    // 绑定复制评价按钮
    document.getElementById('copyReviewBtn').addEventListener('click', copyReviewContent);

    // 绑定确认评价按钮
    document.getElementById('confirmReviewBtn').addEventListener('click', confirmReview);

    // 绑定跳过链接按钮
    document.getElementById('skipLinkBtn').addEventListener('click', skipLinkAndSave);

    // 绑定保存带链接的评价按钮
    document.getElementById('saveReviewWithLinkBtn').addEventListener('click', saveReviewWithLink);

    // 绑定选择评价记录按钮
    document.getElementById('selectReviewBtn').addEventListener('click', showReviewList);

    // 绑定返回按钮
    document.getElementById('backToHintBtn').addEventListener('click', hideReviewList);

    // 绑定保存评价反思按钮
    document.getElementById('saveReviewReflectionBtn').addEventListener('click', () => saveReflection('review'));

    // 绑定"我已复制内容"按钮（发笔记）
    document.getElementById('noteCopyFromLinkBtn').addEventListener('click', function(e) {
        e.preventDefault();
        switchUploadMethod('note', 'paste');
        showToast('✓ 请粘贴你复制的内容');
    });

    // 绑定AI提取按钮（发笔记）
    document.getElementById('noteAiExtractBtn').addEventListener('click', () => aiExtractFormula('note'));

    // 绑定编辑按钮（发笔记）
    document.getElementById('noteEditFormulaBtn').addEventListener('click', function() {
        document.getElementById('noteAiResult').style.display = 'none';
        document.getElementById('noteManualInput').style.display = 'block';
    });

    // 绑定保存AI公式按钮（发笔记）
    document.getElementById('noteSaveAiFormulaBtn').addEventListener('click', () => saveAiFormulas('note'));

    // 绑定保存公式按钮（发笔记）
    document.getElementById('noteSaveFormulaBtn').addEventListener('click', () => saveFormula('note'));

    // 绑定"去写评价"按钮
    document.getElementById('goToReviewBtn').addEventListener('click', function() {
        selectContentType('review', '写评价');
    });

    // 绑定生成笔记按钮
    document.getElementById('generateNoteBtn').addEventListener('click', generateNote);

    // 绑定修改笔记按钮
    document.getElementById('modifyNoteBtn').addEventListener('click', modifyNote);

    // 绑定复制笔记按钮
    document.getElementById('copyNoteBtn').addEventListener('click', copyNoteContent);

    // 绑定确认笔记按钮
    document.getElementById('confirmNoteBtn').addEventListener('click', confirmNote);

    // 绑定保存笔记反思按钮
    document.getElementById('saveNoteReflectionBtn').addEventListener('click', () => saveReflection('note'));

    // ==================== 记录本 ====================
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
}

/**
 * 选择内容类型
 */
function selectContentType(type, typeName) {
    appState.currentType = type;
    appState.currentTypeName = typeName;

    // 更新类型选择器样式
    document.querySelectorAll('.content-type').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    // 显示工作区，隐藏初始提示
    document.getElementById('workspace').style.display = 'block';
    document.getElementById('initialHint').style.display = 'none';

    // 隐藏所有模块
    document.getElementById('reviewModule').style.display = 'none';
    document.getElementById('noteModule').style.display = 'none';

    // 显示选中模块
    document.getElementById(`${type}Module`).style.display = 'block';

    // 重置到第一步
    switchStep(type, 1);

    // 更新类型名称显示
    document.querySelectorAll('.type-name').forEach(el => {
        el.textContent = typeName;
    });
}

/**
 * 切换步骤
 */
function switchStep(type, step) {
    appState.currentStep = step;

    // 隐藏该类型的所有步骤
    const module = document.getElementById(`${type}Module`);
    module.querySelectorAll('.step-view, .write-form, .reflect-form').forEach(el => {
        el.classList.remove('active');
    });

    // 显示选中步骤
    const stepElement = document.getElementById(`${type}Step${step}`);
    if (stepElement) {
        stepElement.classList.add('active');
    }

    // 更新进度圈状态
    module.querySelectorAll('.progress-circle').forEach(circle => {
        const stepNum = parseInt(circle.dataset.step);
        circle.classList.remove('active', 'completed');
        if (stepNum < step) {
            circle.classList.add('completed');
        } else if (stepNum === step) {
            circle.classList.add('active');
        }
    });

    // 清空输入和结果
    clearStepData(type, step);
}

/**
 * 清空步骤数据
 */
function clearStepData(type, step) {
    if (type === 'review') {
        if (step === 1) {
            document.getElementById('analyzeInput').value = '';
            document.getElementById('formulaContent').value = '';
            document.getElementById('aiResult').style.display = 'none';
            document.getElementById('manualInput').style.display = 'block';
            document.getElementById('aiTitle').value = '';
            document.getElementById('aiOpening').value = '';
            document.getElementById('aiStructure').value = '';
            document.getElementById('aiHighlight').value = '';
        } else if (step === 2) {
            document.getElementById('reviewExperience').value = '';
            document.getElementById('reviewRequirements').value = '';
            document.getElementById('generatedReview').style.display = 'none';
        } else if (step === 3) {
            document.getElementById('reviewSmoothPart').value = '';
            document.getElementById('reviewImproveIdea').value = '';
            document.querySelectorAll('#reviewStep3 .checkbox-group input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    } else if (type === 'note') {
        if (step === 1) {
            document.getElementById('noteAnalyzeInput').value = '';
            document.getElementById('noteFormulaContent').value = '';
            document.getElementById('noteAiResult').style.display = 'none';
            document.getElementById('noteManualInput').style.display = 'block';
        } else if (step === 2) {
            document.getElementById('generatedNote').style.display = 'none';
            // 检查是否有确认的评价
            updateNoteGenerateArea();
        } else if (step === 3) {
            document.getElementById('noteSmoothPart').value = '';
            document.getElementById('noteImproveIdea').value = '';
            document.querySelectorAll('#noteStep3 .checkbox-group input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    }
}

/**
 * 切换上传方式
 */
function switchUploadMethod(type, method) {
    const module = document.getElementById(`${type}Module`);

    // 更新按钮状态
    module.querySelectorAll('.method-btn[data-method]').forEach(btn => {
        btn.classList.remove('active');
    });
    module.querySelector(`[data-method="${method}"]`).classList.add('active');

    // 更新内容显示
    module.querySelectorAll('.method-content').forEach(content => {
        content.classList.remove('active');
    });
    module.getElementById(`${method}Method`)?.classList.add('active');
    module.getElementById(`${type}${method.charAt(0).toUpperCase() + method.slice(1)}Method`)?.classList.add('active');
}

/**
 * 切换输入方式
 */
function switchInputMethod(method) {
    const experienceInput = document.getElementById('reviewExperience');
    const voiceArea = document.getElementById('voiceInputArea');

    if (method === 'text') {
        experienceInput.style.display = 'block';
        voiceArea.style.display = 'none';
    } else if (method === 'voice') {
        experienceInput.style.display = 'none';
        voiceArea.style.display = 'flex';
    }

    // 更新按钮状态
    document.querySelectorAll('.method-btn[data-input]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-input="${method}"]`).classList.add('active');
}

/**
 * 选择公式分类
 */
function selectFormulaCategory(element) {
    const parent = element.closest('.type-module');
    parent.querySelectorAll('.formula-category').forEach(item => {
        item.classList.remove('selected');
    });
    element.classList.add('selected');
    appState.currentFormulaCategory = element.dataset.category;
}

/**
 * AI提取公式
 */
async function aiExtractFormula(type) {
    const inputId = type === 'review' ? 'analyzeInput' : 'noteAnalyzeInput';
    const content = document.getElementById(inputId).value.trim();

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

    const btnId = type === 'review' ? 'aiExtractBtn' : 'noteAiExtractBtn';
    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.textContent = '🤖 分析中...';

    try {
        const result = await extractFormula(content, type);

        // 填充分析结果
        const prefix = type === 'review' ? '' : 'note';
        document.getElementById(`${prefix}aiTitle`).value = result.title || '暂无明显特征';
        document.getElementById(`${prefix}aiOpening`).value = result.opening || '暂无明显特征';
        document.getElementById(`${prefix}aiStructure`).value = result.structure || '暂无明显特征';
        document.getElementById(`${prefix}aiHighlight`).value = result.highlight || '暂无明显特征';

        // 显示AI结果
        document.getElementById(`${prefix}aiResult`).style.display = 'block';
        document.getElementById(`${prefix}manualInput`).style.display = 'none';

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
function saveAiFormulas(type) {
    const prefix = type === 'review' ? '' : 'note';
    const categories = ['title', 'opening', 'structure', 'highlight'];

    let savedCount = 0;

    categories.forEach(category => {
        const id = `${prefix}ai${category.charAt(0).toUpperCase() + category.slice(1)}`;
        const content = document.getElementById(id).value.trim();
        if (content && content !== '暂无明显特征') {
            saveFormulaToStorage(category, content, type);
            savedCount++;
        }
    });

    if (savedCount > 0) {
        updateCounts();
        showToast(`✓ 已保存 ${savedCount} 条公式`);

        // 清空输入
        const inputId = type === 'review' ? 'analyzeInput' : 'noteAnalyzeInput';
        document.getElementById(inputId).value = '';
        document.getElementById(`${prefix}aiResult`).style.display = 'none';
        document.getElementById(`${prefix}manualInput`).style.display = 'block';

        // 自动跳到下一步
        setTimeout(() => switchStep(type, 2), 500);
    } else {
        showToast('没有可保存的公式', 'error');
    }
}

/**
 * 保存公式
 */
function saveFormula(type) {
    const prefix = type === 'review' ? '' : 'note';
    const contentId = `${prefix}formulaContent`;
    const content = document.getElementById(contentId).value.trim();

    if (!content) {
        showToast('请先输入公式内容', 'error');
        return;
    }

    saveFormulaToStorage(appState.currentFormulaCategory, content, type);
    updateCounts();
    showToast('✓ 已保存到公式库');

    // 清空输入
    const inputId = type === 'review' ? 'analyzeInput' : 'noteAnalyzeInput';
    document.getElementById(inputId).value = '';
    document.getElementById(contentId).value = '';

    // 自动跳到下一步
    setTimeout(() => switchStep(type, 2), 500);
}

/**
 * 生成评价
 */
async function generateReview() {
    const experience = document.getElementById('reviewExperience').value.trim();
    const requirements = document.getElementById('reviewRequirements').value.trim();

    if (!experience) {
        showToast('请先输入真实体验', 'error');
        return;
    }

    const btn = document.getElementById('generateReviewBtn');
    btn.disabled = true;
    btn.textContent = '🤖 生成中...';

    try {
        // 检查AI配置
        if (!hasAIConfig()) {
            showToast('请先配置AI（点击右上角🤖按钮）', 'error');
            // 使用备用模板
            const content = generateReviewByTemplate(experience, requirements);
            document.getElementById('generatedReviewText').textContent = content;
            document.getElementById('generatedReview').style.display = 'block';
            analyzeReviewContent(content);
            btn.disabled = false;
            btn.textContent = '🤖 生成评价';
            return;
        }

        // 调用AI生成评价内容
        const params = {
            experience: experience,
            requirements: requirements
        };

        const content = await generateReviewByAI(params);

        document.getElementById('generatedReviewText').textContent = content;
        document.getElementById('generatedReview').style.display = 'block';

        // 分析内容
        analyzeReviewContent(content);

        showToast('✓ 评价生成完成');
    } catch (error) {
        // 如果AI调用失败，使用备用模板
        console.warn('AI生成失败，使用备用模板:', error);
        const content = generateReviewByTemplate(experience, requirements);
        document.getElementById('generatedReviewText').textContent = content;
        document.getElementById('generatedReview').style.display = 'block';

        // 分析内容
        analyzeReviewContent(content);

        showToast('AI生成失败，已使用内置模板', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🤖 生成评价';
    }
}

/**
 * 使用备用模板生成评价
 */
function generateReviewByTemplate(experience, requirements) {
    // 简单处理体验内容，控制在100-200字
    let content = experience;

    // 如果内容过长，截取前面部分
    if (content.length > 150) {
        content = content.substring(0, 150) + '...';
    }

    // 确保内容在100-200字之间
    while (content.length < 100) {
        content += ' 体验不错，值得推荐。';
    }

    if (content.length > 200) {
        content = content.substring(0, 200);
    }

    return content;
}

/**
 * 分析评价内容
 */
function analyzeReviewContent(content) {
    const analysis = document.getElementById('reviewAnalysis');

    // 分析内容框架
    const hasStructure = content.includes('，') || content.includes('。') || content.includes('、');
    const structureText = hasStructure ? '有结构层次' : '结构较简单';

    // 字数统计
    const wordCount = content.length;
    const wordCountText = wordCount + '字' + (wordCount >= 100 && wordCount <= 200 ? '（符合要求）' : '（需调整）');

    // 分析优点
    const advantages = [];
    if (wordCount >= 100 && wordCount <= 200) advantages.push('字数控制好');
    if (hasStructure) advantages.push('结构清晰');
    if (content.includes('不错') || content.includes('推荐') || content.includes('好')) advantages.push('有推荐倾向');
    const advantagesText = advantages.length > 0 ? advantages.join('、') : '暂无明显优点';

    // 分析待改进
    const improvements = [];
    if (wordCount < 100) improvements.push('内容偏短，可补充细节');
    if (wordCount > 200) improvements.push('内容偏长，建议精简');
    if (!hasStructure) improvements.push('建议增加结构层次');
    if (!content.includes('推荐') && !content.includes('不错')) improvements.push('可增加推荐倾向');
    const improvementsText = improvements.length > 0 ? improvements.join('、') : '暂无明显问题';

    // 更新分析结果
    analysis.innerHTML = `
        <div class="analysis-section">
            <span class="analysis-label">内容框架：</span>
            <span class="analysis-value">${structureText}</span>
        </div>
        <div class="analysis-section">
            <span class="analysis-label">字数统计：</span>
            <span class="analysis-value">${wordCountText}</span>
        </div>
        <div class="analysis-section">
            <span class="analysis-label">优点：</span>
            <span class="analysis-value">${advantagesText}</span>
        </div>
        <div class="analysis-section">
            <span class="analysis-label">待改进：</span>
            <span class="analysis-value">${improvementsText}</span>
        </div>
    `;
}

/**
 * 复制评价内容
 */
function copyReviewContent() {
    const content = document.getElementById('generatedReviewText').textContent;
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
 * 确认评价
 */
function confirmReview() {
    const content = document.getElementById('generatedReviewText').textContent;
    if (!content) {
        showToast('请先生成评价内容', 'error');
        return;
    }

    confirmedReview = content;

    // 隐藏生成内容区域，显示提交链接区域
    document.getElementById('generatedReview').style.display = 'none';
    document.getElementById('submitLinkArea').style.display = 'block';

    showToast('✓ 评价已确认，请提交大众点评链接（可选）');
}

/**
 * 跳过链接并保存
 */
function skipLinkAndSave() {
    saveReviewToStorage(null);
}

/**
 * 保存带链接的评价
 */
function saveReviewWithLink() {
    const link = document.getElementById('reviewLinkInput').value.trim();
    saveReviewToStorage(link);
}

/**
 * 保存评价到存储
 */
function saveReviewToStorage(link) {
    if (!confirmedReview) {
        showToast('请先生成并确认评价内容', 'error');
        return;
    }

    // 保存到评价记录
    const work = {
        type: 'review',
        content: confirmedReview,
        experience: document.getElementById('reviewExperience').value,
        requirements: document.getElementById('reviewRequirements').value,
        link: link || null
    };

    saveWorkToStorage(work);
    updateCounts();

    // 清空输入
    document.getElementById('reviewLinkInput').value = '';
    document.getElementById('submitLinkArea').style.display = 'none';

    showToast(link ? '✓ 评价和链接已保存到评价记录' : '✓ 评价已保存到评价记录');

    // 自动跳到反思步骤
    setTimeout(() => switchStep('review', 3), 500);
}

/**
 * 显示评价记录列表
 */
function showReviewList() {
    const works = getWorksFromStorage().filter(w => w.type === 'review');

    if (works.length === 0) {
        showToast('暂无评价记录，请先写一篇评价', 'error');
        return;
    }

    const reviewList = document.getElementById('reviewList');
    reviewList.innerHTML = works.reverse().map(work => {
        const date = new Date(work.createdAt).toLocaleDateString('zh-CN');
        return `
            <div class="review-item" onclick="selectReviewForNote(${work.id})">
                <div class="review-item-date">${date}</div>
                <div class="review-item-content">${work.content.substring(0, 80)}...</div>
                ${work.link ? `<div class="review-item-link">🔗 ${work.link}</div>` : ''}
            </div>
        `;
    }).join('');

    document.getElementById('noReviewHint').style.display = 'none';
    document.getElementById('selectReviewArea').style.display = 'block';
}

/**
 * 隐藏评价记录列表
 */
function hideReviewList() {
    document.getElementById('selectReviewArea').style.display = 'none';
    document.getElementById('noReviewHint').style.display = 'block';
}

/**
 * 选择评价记录生成笔记
 */
function selectReviewForNote(reviewId) {
    const works = getWorksFromStorage();
    const selectedWork = works.find(w => w.id === reviewId);

    if (selectedWork) {
        confirmedReview = selectedWork.content;
        selectedReviewId = reviewId;

        // 隐藏选择区域，显示生成区域
        document.getElementById('selectReviewArea').style.display = 'none';
        document.getElementById('noteGenerateArea').style.display = 'block';
        document.getElementById('baseReviewText').textContent = confirmedReview;

        showToast('✓ 已选择评价记录，现在可以生成笔记');
    }
}

/**
 * 更新笔记生成区域
 */
function updateNoteGenerateArea() {
    const noReviewHint = document.getElementById('noReviewHint');
    const noteGenerateArea = document.getElementById('noteGenerateArea');

    if (confirmedReview) {
        noReviewHint.style.display = 'none';
        noteGenerateArea.style.display = 'block';
        document.getElementById('baseReviewText').textContent = confirmedReview;
    } else {
        // 检查是否有评价记录
        const reviewWorks = getWorksFromStorage().filter(w => w.type === 'review');
        if (reviewWorks.length > 0) {
            // 有评价记录，显示选择按钮
            noReviewHint.style.display = 'block';
            noReviewHint.querySelector('p').textContent = `有 ${reviewWorks.length} 条评价记录可选择，或去写一篇新评价`;
            noteGenerateArea.style.display = 'none';
        } else {
            // 没有评价记录
            noReviewHint.style.display = 'block';
            noReviewHint.querySelector('p').textContent = '请先完成并确认一篇评价内容，或去写评价';
            noteGenerateArea.style.display = 'none';
        }
    }
}

/**
 * 生成笔记
 */
async function generateNote() {
    if (!confirmedReview) {
        showToast('请先确认一篇评价内容', 'error');
        return;
    }

    const btn = document.getElementById('generateNoteBtn');
    btn.disabled = true;
    btn.textContent = '🤖 生成中...';

    try {
        // 检查AI配置
        if (!hasAIConfig()) {
            showToast('请先配置AI（点击右上角🤖按钮）', 'error');
            // 使用备用模板
            const content = generateNoteByTemplate(confirmedReview);
            document.getElementById('generatedNoteText').textContent = content;
            document.getElementById('generatedNote').style.display = 'block';
            btn.disabled = false;
            btn.textContent = '🤖 自动生成笔记';
            return;
        }

        // 调用AI生成笔记内容（基于评价内容，探店模式）
        const content = await generateNoteByAI(confirmedReview);

        document.getElementById('generatedNoteText').textContent = content;
        document.getElementById('generatedNote').style.display = 'block';

        showToast('✓ 笔记生成完成');
    } catch (error) {
        // 如果AI调用失败，使用备用模板
        console.warn('AI生成失败，使用备用模板:', error);
        const content = generateNoteByTemplate(confirmedReview);
        document.getElementById('generatedNoteText').textContent = content;
        document.getElementById('generatedNote').style.display = 'block';

        showToast('AI生成失败，已使用内置模板', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🤖 自动生成笔记';
    }
}

/**
 * 使用备用模板生成笔记
 */
function generateNoteByTemplate(reviewContent) {
    return `🔥 终于来拔草了！

${reviewContent}

真的对得起排队！

📍 地址：待补充

✅ 体验很不错，推荐来~

#探店 #美食 #宝藏小店 #周末去哪儿`;
}

/**
 * 修改笔记
 */
async function modifyNote() {
    const suggestion = document.getElementById('noteModifySuggestion').value.trim();
    if (!suggestion) {
        showToast('请先输入修改建议', 'error');
        return;
    }

    const currentContent = document.getElementById('generatedNoteText').textContent;

    try {
        // 检查AI配置
        if (!hasAIConfig()) {
            throw new Error('请先配置AI API Key');
        }

        // 调用AI根据建议修改笔记
        const content = await modifyNoteByAI(currentContent, suggestion);

        document.getElementById('generatedNoteText').textContent = content;
        document.getElementById('noteModifySuggestion').value = '';

        showToast('✓ 笔记已修改');
    } catch (error) {
        showToast('AI修改失败：' + error.message, 'error');
    }
}

/**
 * 复制笔记内容
 */
function copyNoteContent() {
    const content = document.getElementById('generatedNoteText').textContent;
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
 * 确认笔记
 */
function confirmNote() {
    const content = document.getElementById('generatedNoteText').textContent;
    if (!content) {
        showToast('请先生成笔记内容', 'error');
        return;
    }

    // 保存到评价记录
    const work = {
        type: 'note',
        content: content,
        baseReview: confirmedReview,
        baseReviewId: selectedReviewId
    };

    saveWorkToStorage(work);
    updateCounts();
    showToast('✓ 笔记已确认，已保存到评价记录');

    // 自动跳到反思步骤
    setTimeout(() => switchStep('note', 3), 500);
}

/**
 * 保存反思
 */
function saveReflection(type) {
    const smoothPartId = type === 'review' ? 'reviewSmoothPart' : 'noteSmoothPart';
    const improveIdeaId = type === 'review' ? 'reviewImproveIdea' : 'noteImproveIdea';

    const smoothPart = document.getElementById(smoothPartId).value.trim();
    const improveIdea = document.getElementById(improveIdeaId).value.trim();

    if (!smoothPart && !improveIdea) {
        showToast('请至少填写一项反思内容', 'error');
        return;
    }

    // 获取满意的部分
    const satisfiedParts = [];
    const checkboxGroup = type === 'review' ? 'reviewStep3' : 'noteStep3';
    document.querySelectorAll(`#${checkboxGroup} .checkbox-group input[type="checkbox"]:checked`).forEach(cb => {
        satisfiedParts.push(cb.value);
    });

    const reflection = {
        type: type,
        satisfiedParts: satisfiedParts,
        smoothPart: smoothPart,
        improveIdea: improveIdea
    };

    saveReflectionToStorage(reflection);
    updateCounts();
    triggerCloudSync(); // 触发云端同步
    showToast('✓ 反思已保存');

    // 检查是否达到5次，提示做风格总结
    const reflectionCount = getReflectionsByType(type).length;
    if (reflectionCount % 5 === 0) {
        setTimeout(() => {
            const typeName = type === 'review' ? '写评价' : '发笔记';
            alert(`🎉 你已完成 ${reflectionCount} 次${typeName}循环！\n\n可以去看看你的风格总结了！`);
        }, 600);
    }

    // 回到第一步继续循环
    setTimeout(() => switchStep(type, 1), 600);
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
            const typeName = item.contentType === 'review' ? '评价' : '笔记';
            html += `
                <div class="notebook-item">
                    <div class="notebook-item-date">${date} · ${typeName} · ${categoryNames[cat]}${item.count > 1 ? `<span class="notebook-item-count">🔥 ${item.count}次</span>` : ''}</div>
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
        return '<div class="empty-state"><div class="empty-state-icon">📝</div><p>暂无评价记录</p><p style="font-size:12px;margin-top:8px;">去"写"一篇内容，记录你的第一篇评价吧！</p></div>';
    }

    const typeNames = { review: '写评价', note: '发笔记' };

    return works.reverse().map(work => {
        const date = new Date(work.createdAt).toLocaleDateString('zh-CN');
        return `
            <div class="notebook-item">
                <div class="notebook-item-date">${date} · ${typeNames[work.type] || work.type}</div>
                <div class="notebook-item-content">
                    <div class="work-content">${work.content}</div>
                    ${work.link ? `<div style="margin-top:8px;"><small style="color:#3498db;">🔗 <a href="${work.link}" target="_blank">查看大众点评链接</a></small></div>` : ''}
                </div>
                <button class="btn-copy-work" onclick="copyWorkContent(${work.id})" style="margin-top:8px;padding:4px 12px;font-size:12px;background:#ecf0f1;border:none;border-radius:4px;cursor:pointer;">📋 复制内容</button>
            </div>
        `;
    }).join('');
}

/**
 * 复制作品内容
 */
function copyWorkContent(workId) {
    const works = getWorksFromStorage();
    const work = works.find(w => w.id === workId);

    if (work) {
        navigator.clipboard.writeText(work.content).then(() => {
            showToast('✓ 已复制到剪贴板');
        }).catch(() => {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = work.content;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('✓ 已复制到剪贴板');
        });
    }
}

/**
 * 渲染反思列表
 */
function renderReflections() {
    const reflections = getReflectionsFromStorage();

    if (reflections.length === 0) {
        return '<div class="empty-state"><div class="empty-state-icon">🌱</div><p>暂无成长日记</p><p style="font-size:12px;margin-top:8px;">完成一次循环后，记录你的第一次反思吧！</p></div>';
    }

    const typeNames = { review: '写评价', note: '发笔记' };
    const satisfiedNamesReview = { content: '内容描述', tone: '语气风格', length: '字数控制', structure: '结构安排' };
    const satisfiedNamesNote = { title: '标题', content: '内容结构', emoji: '表情使用', tags: '话题标签' };

    return reflections.reverse().map(ref => {
        const date = new Date(ref.createdAt).toLocaleDateString('zh-CN');
        const satisfiedNames = ref.type === 'review' ? satisfiedNamesReview : satisfiedNamesNote;
        const satisfiedText = ref.satisfiedParts.map(p => satisfiedNames[p] || p).join('、');

        return `
            <div class="notebook-item">
                <div class="notebook-item-date">${date} · ${typeNames[ref.type] || ref.type}</div>
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
 * 渲染风格总结
 */
function renderStyles() {
    const reflections = getReflectionsFromStorage();
    const typeNames = {
        review: { icon: '⭐', name: '写评价' },
        note: { icon: '📔', name: '发笔记' }
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
 * 显示补录评价模态框
 */
function showAddReviewModal() {
    document.getElementById('addReviewModal').classList.add('show');
    // 清空表单
    document.getElementById('addReviewContent').value = '';
    document.getElementById('addReviewLink').value = '';
    document.getElementById('addReviewDate').value = '';
}

/**
 * 关闭补录评价模态框
 */
function closeAddReviewModal() {
    document.getElementById('addReviewModal').classList.remove('show');
}

/**
 * 保存补录的评价
 */
function saveAddedReview() {
    const content = document.getElementById('addReviewContent').value.trim();
    const link = document.getElementById('addReviewLink').value.trim();
    const date = document.getElementById('addReviewDate').value;

    if (!content) {
        showToast('请输入评价内容', 'error');
        return;
    }

    // 创建评价记录
    const work = {
        type: 'review',
        content: content,
        link: link || null,
        createdAt: date ? new Date(date).toISOString() : new Date().toISOString(),
        // 标记为补录
        isBackfilled: true
    };

    saveWorkToStorage(work);
    updateCounts();

    // 关闭模态框
    closeAddReviewModal();

    showToast('✓ 评价已补录到评价记录');

    // 如果评价记录模态框是打开的，刷新它
    if (document.getElementById('notebookModal').classList.contains('show')) {
        openNotebook('works');
    }
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

function saveFormulaToStorage(category, content, contentType) {
    const data = getData();
    const existing = data.formulas[category].find(f => f.content === content && f.contentType === contentType);
    if (existing) {
        existing.count++;
        existing.lastUsed = new Date().toISOString();
    } else {
        data.formulas[category].push({
            id: Date.now(),
            content: content,
            type: category,
            contentType: contentType,
            createdAt: new Date().toISOString(),
            count: 1
        });
    }
    saveData(data);
    triggerCloudSync(); // 触发云端同步
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
    triggerCloudSync(); // 触发云端同步
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

// ==================== 云端同步功能 ====================

/**
 * 初始化云端同步
 */
function initCloudSync() {
    // 公共云端存储始终可用
    window.cloudStorage.init();

    // 启动自动同步（每5分钟）
    window.cloudStorage.startAutoSync(5);

    // 监听同步状态
    window.cloudStorage.onStatusChange(handleCloudStatusChange);

    // 首次加载时尝试同步
    setTimeout(() => {
        window.cloudStorage.sync().catch(() => {
            // 同步失败不影响使用
            console.log('同步失败，将使用本地数据');
        });
    }, 1000);

    // 绑定AI配置按钮
    document.getElementById('aiConfigBtn').addEventListener('click', openAiConfigModal);
}

/**
 * 打开AI配置模态框
 */
function openAiConfigModal() {
    const modal = document.getElementById('aiConfigModal');

    // 加载现有配置
    const config = getAIConfig();
    if (config.apiKey) {
        document.getElementById('aiApiKey').value = config.apiKey;
        document.getElementById('aiModel').value = config.model || 'glm-4-flash';
    }

    modal.classList.add('show');

    // 绑定保存按钮
    document.getElementById('saveAiConfigBtn').onclick = saveAiConfig;
}

/**
 * 关闭AI配置模态框
 */
function closeAiConfigModal() {
    document.getElementById('aiConfigModal').classList.remove('show');
}

/**
 * 保存AI配置
 */
function saveAiConfig() {
    const apiKey = document.getElementById('aiApiKey').value.trim();
    const model = document.getElementById('aiModel').value.trim() || 'glm-4-flash';

    if (!apiKey) {
        showToast('请输入API Key', 'error');
        return;
    }

    // 保存配置
    saveAIConfig(apiKey, null, model);

    showToast('✓ AI配置已保存');
    closeAiConfigModal();
}

/**
 * 处理云端状态变化
 */
function handleCloudStatusChange(status, error) {
    const cloudStatus = document.getElementById('cloudStatus');
    if (!cloudStatus) return;

    const icon = cloudStatus.querySelector('.cloud-status-icon');
    const text = cloudStatus.querySelector('.cloud-status-text');

    switch (status) {
        case 'downloading':
            icon.textContent = '⬇️';
            text.textContent = '同步中';
            break;
        case 'uploading':
            icon.textContent = '⬆️';
            text.textContent = '上传中';
            break;
        case 'success':
            icon.textContent = '✅';
            text.textContent = '已同步';
            setTimeout(() => {
                icon.textContent = '☁️';
                text.textContent = '自动同步已启用';
            }, 3000);
            break;
        case 'error':
            // 同步失败不影响使用，保持启用状态
            console.error('云端同步错误:', error);
            break;
    }
}

/**
 * 暴露全局函数供云端存储使用
 */
window.getStorageData = getData;
window.saveStorageData = saveData;

/**
 * 触发云端同步（延迟执行，避免频繁调用）
 */
let syncTimer = null;
function triggerCloudSync() {
    if (!window.cloudStorage || !window.cloudStorage.isConfigured()) {
        return;
    }

    // 清除之前的定时器
    if (syncTimer) {
        clearTimeout(syncTimer);
    }

    // 延迟3秒执行，避免频繁同步
    syncTimer = setTimeout(() => {
        window.cloudStorage.sync().catch(error => {
            console.log('自动同步失败:', error);
        });
        syncTimer = null;
    }, 3000);
}
