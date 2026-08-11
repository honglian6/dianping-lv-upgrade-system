/**
 * AI功能模块
 * 从config.js读取配置
 */

// 从config.js读取配置，如果不存在则使用默认值
let aiConfig = {
    apiKey: '',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash'
};

// 尝试加载配置（仅在浏览器环境中）
try {
    if (typeof AI_CONFIG !== 'undefined') {
        aiConfig = { ...aiConfig, ...AI_CONFIG };
    }
} catch (e) {
    console.warn('AI config not found, using defaults');
}

const AI_CONFIG_KEY = 'ai_config';

/**
 * 获取AI配置
 */
function getAIConfig() {
    // 优先使用config.js中的配置
    if (aiConfig.apiKey) {
        return aiConfig;
    }

    // 其次使用localStorage中的配置
    const userConfig = localStorage.getItem(AI_CONFIG_KEY);
    if (userConfig) {
        return JSON.parse(userConfig);
    }

    // 返回空配置
    return {
        apiKey: '',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash'
    };
}

/**
 * 保存AI配置
 */
function saveAIConfig(apiKey, baseURL, model) {
    const config = {
        apiKey: apiKey,
        baseURL: baseURL || 'https://open.bigmodel.cn/api/paas/v4',
        model: model || 'glm-4-flash'
    };
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    return config;
}

/**
 * 检查AI配置是否完整
 */
function hasAIConfig() {
    const config = getAIConfig();
    return !!config.apiKey;
}

/**
 * 调用AI分析内容并提取公式
 * @param {string} content - 要分析的内容
 * @param {string} contentType - 内容类型（review/note/favorite）
 * @returns {Promise<Object>} - 分析结果
 */
async function extractFormula(content, contentType) {
    const config = getAIConfig();

    if (!config.apiKey) {
        throw new Error('请先配置AI API Key');
    }

    const typeNames = {
        review: '写评价',
        note: '发笔记'
    };

    const prompt = `你是一个内容创作专家，擅长分析优质内容并提取可复用的写作公式。

请分析以下${typeNames[contentType] || '内容'}，提取其中可复用的写作技巧。

【内容类型】${typeNames[contentType] || '内容'}

【内容】
${content}

请分析并返回JSON格式的结果，包含以下字段：
{
  "title": "标题公式（如果有标题，描述其套路）",
  "opening": "开头套路",
  "structure": "结构框架",
  "highlight": "亮点技巧"
}

如果某项没有明显特征，请返回"暂无明显特征"。`;

    try {
        const response = await fetch(`${config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'AI请求失败');
        }

        const data = await response.json();
        const content_result = data.choices[0].message.content;

        // 尝试解析JSON
        let result;
        try {
            // 清理可能的markdown代码块标记
            const cleanContent = content_result
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            result = JSON.parse(cleanContent);
        } catch (e) {
            // 如果JSON解析失败，返回原始内容
            result = {
                title: '解析失败',
                opening: '解析失败',
                structure: '解析失败',
                highlight: '解析失败',
                raw: content_result
            };
        }

        return result;
    } catch (error) {
        console.error('AI分析失败:', error);
        throw error;
    }
}

/**
 * 调用AI生成评价内容
 * @param {Object} params - 生成参数 {experience, requirements}
 * @returns {Promise<string>} - 生成的内容
 */
async function generateReviewByAI(params) {
    const config = getAIConfig();

    if (!config.apiKey) {
        throw new Error('请先配置AI API Key');
    }

    const prompt = `你是一个优质的内容创作者，擅长写大众点评评价。

请根据以下真实体验，生成一篇优质评价：

【真实体验】${params.experience || '未提供'}
${params.requirements ? `【写作要求】${params.requirements}` : ''}

请生成评价内容，要求：
1. 不需要标题
2. 字数控制在100-200字之间
3. 以真实体验的感觉来写，语气真诚
4. 突出体验的真实感受
5. 有推荐倾向

直接返回生成的内容，不要有任何解释。`;

    try {
        const response = await fetch(`${config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'AI请求失败');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('AI生成失败:', error);
        throw error;
    }
}

/**
 * 调用AI生成笔记内容
 * @param {string} baseReview - 基础评价内容
 * @returns {Promise<string>} - 生成的内容
 */
async function generateNoteByAI(baseReview) {
    const config = getAIConfig();

    if (!config.apiKey) {
        throw new Error('请先配置AI API Key');
    }

    const prompt = `你是一个优质的内容创作者，擅长写大众点评笔记（探店模式）。

请基于以下评价内容，自动生成一篇探店模式的笔记：

【基础评价内容】
${baseReview}

请生成笔记内容，要求：
1. 标题吸引人，体现探店感
2. 开头有代入感，体现"终于来拔草"的感觉
3. 内容要有具体细节
4. 适当使用emoji表情
5. 结尾要有地址信息（模板形式）
6. 添加话题标签，如 #探店 #美食 #宝藏小店 #周末去哪儿
7. 符合探店分享的特点

直接返回生成的内容，不要有任何解释。`;

    try {
        const response = await fetch(`${config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'AI请求失败');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('AI生成失败:', error);
        throw error;
    }
}

/**
 * 调用AI修改笔记内容
 * @param {string} currentContent - 当前笔记内容
 * @param {string} suggestion - 修改建议
 * @returns {Promise<string>} - 修改后的内容
 */
async function modifyNoteByAI(currentContent, suggestion) {
    const config = getAIConfig();

    if (!config.apiKey) {
        throw new Error('请先配置AI API Key');
    }

    const prompt = `你是一个优质的内容创作者，擅长根据建议修改笔记内容。

【当前笔记内容】
${currentContent}

【修改建议】
${suggestion}

请根据修改建议调整笔记内容，保持原有的风格和结构，只调整建议中提到的部分。

直接返回修改后的内容，不要有任何解释。`;

    try {
        const response = await fetch(`${config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'AI请求失败');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('AI修改失败:', error);
        throw error;
    }
}
