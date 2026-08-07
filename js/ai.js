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
 * 保存AI配置
 */
function saveAIConfig(apiKey, baseURL, model) {
    const config = {
        apiKey: apiKey,
        baseURL: baseURL || 'https://api.openai.com/v1',
        model: model || 'gpt-3.5-turbo'
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
        note: '发笔记',
        favorite: '标记好去处'
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
 * 调用AI生成内容
 * @param {string} type - 内容类型
 * @param {Object} params - 生成参数
 * @returns {Promise<string>} - 生成的内容
 */
async function generateContentByAI(type, params) {
    const config = getAIConfig();

    if (!config.apiKey) {
        throw new Error('请先配置AI API Key');
    }

    const typeNames = {
        review: '写评价',
        note: '发笔记',
        favorite: '标记好去处'
    };

    const prompt = `你是一个优质的内容创作者，擅长写${typeNames[type] || '内容'}。

请根据以下信息，生成一篇优质的${typeNames[type] || '内容'}：

【店铺/地点名称】${params.venueName || '未提供'}
【位置】${params.location || '未提供'}
【体验关键词】${params.keywords || '未提供'}

请生成内容，要求：
1. 标题吸引人
2. 开头有代入感
3. 内容有具体细节
4. 适当使用emoji
5. 符合${typeNames[type] || '内容'}的特点

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
