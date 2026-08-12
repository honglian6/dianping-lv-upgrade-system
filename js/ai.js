/**
 * AI功能模块
 * 支持多种AI服务：智谱AI、Claude、OpenAI等
 */

// 默认配置（使用智谱AI的GLM-4-Plus模型）
const DEFAULT_AI_CONFIG = {
    apiKey: 'b6f8a671c5254c00ba546dbb4c2828e5.eCO79QyB8SmVBodV',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-plus',
    provider: 'zhipu' // 智谱AI原生模型
};

// AI服务预设配置
const AI_PRESETS = {
    'claude-compatible': {
        name: 'Claude Code (智谱兼容)',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        defaultModel: 'claude-3-5-sonnet-20241022',
        description: '智谱AI Claude兼容模式，高质量Claude体验'
    },
    zhipu: {
        name: '智谱AI原生',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        defaultModel: 'glm-4-plus',
        description: '智谱AI原生GLM模型'
    },
    claude: {
        name: 'Claude (Anthropic)',
        baseURL: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-5-sonnet-20241022',
        description: 'Claude官方API'
    },
    openai: {
        name: 'OpenAI',
        baseURL: 'https://api.openai.com/v1',
        defaultModel: 'gpt-3.5-turbo',
        description: '经典AI服务'
    }
};

// 从config.js读取配置，如果不存在则使用默认值
let aiConfig = { ...DEFAULT_AI_CONFIG };

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
        model: 'glm-4-flash',
        provider: 'zhipu'
    };
}

/**
 * 保存AI配置
 */
function saveAIConfig(apiKey, provider, customBaseURL, customModel) {
    const preset = AI_PRESETS[provider] || AI_PRESETS.zhipu;

    const config = {
        apiKey: apiKey,
        baseURL: customBaseURL || preset.baseURL,
        model: customModel || preset.defaultModel,
        provider: provider
    };
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    return config;
}

/**
 * 获取AI服务预设
 */
function getAIPresets() {
    return AI_PRESETS;
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
        const result = await callAI(prompt, 0.7, 1000);

        // 尝试解析JSON
        try {
            // 清理可能的markdown代码块标记
            const cleanContent = result
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            return JSON.parse(cleanContent);
        } catch (e) {
            // 如果JSON解析失败，返回原始内容
            return {
                title: '解析失败',
                opening: '解析失败',
                structure: '解析失败',
                highlight: '解析失败',
                raw: result
            };
        }
    } catch (error) {
        console.error('AI分析失败:', error);
        throw error;
    }
}

/**
 * 统一AI调用接口（支持智谱AI Claude兼容模式）
 * @param {string} prompt - 提示词
 * @param {number} temperature - 温度参数
 * @param {number} maxTokens - 最大token数
 * @returns {Promise<string>} - AI返回的内容
 */
async function callAI(prompt, temperature = 0.7, maxTokens = 1000) {
    const config = getAIConfig();

    if (!config.apiKey) {
        throw new Error('请先配置AI API Key');
    }

    let headers = {
        'Content-Type': 'application/json'
    };

    let body = {};
    let endpoint = config.baseURL;

    // 智谱AI Claude兼容模式和原生GLM模型都使用OpenAI格式
    if (config.provider === 'claude-compatible' || config.provider === 'zhipu') {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        endpoint += '/chat/completions';
        body = {
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: temperature,
            max_tokens: maxTokens
        };
    } else if (config.provider === 'claude') {
        // 真正的Claude API格式
        headers['x-api-key'] = config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        endpoint += '/messages';
        body = {
            model: config.model,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
        };
    } else if (config.provider === 'openai') {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        endpoint += '/chat/completions';
        body = {
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: temperature,
            max_tokens: maxTokens
        };
    } else {
        // 默认使用智谱AI格式
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        endpoint += '/chat/completions';
        body = {
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: temperature,
            max_tokens: maxTokens
        };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'AI请求失败');
    }

    const data = await response.json();

    // 根据不同provider返回内容
    if (config.provider === 'claude') {
        return data.content[0].text;
    } else {
        return data.choices[0].message.content;
    }
}

/**
 * 调用AI生成评价内容
 * @param {Object} params - 生成参数 {experience, requirements}
 * @returns {Promise<string>} - 生成的内容
 */
async function generateReviewByAI(params) {
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
6. 语言生动，有感染力

直接返回生成的内容，不要有任何解释。`;

    return await callAI(prompt, 0.8, 500);
}

/**
 * 调用AI生成笔记内容
 * @param {string} baseReview - 基础评价内容
 * @returns {Promise<string>} - 生成的内容
 */
async function generateNoteByAI(baseReview) {
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
8. 语言生动有趣，有感染力

直接返回生成的内容，不要有任何解释。`;

    return await callAI(prompt, 0.8, 1500);
}

/**
 * 调用AI修改笔记内容
 * @param {string} currentContent - 当前笔记内容
 * @param {string} suggestion - 修改建议
 * @returns {Promise<string>} - 修改后的内容
 */
async function modifyNoteByAI(currentContent, suggestion) {
    const prompt = `你是一个优质的内容创作者，擅长根据建议修改笔记内容。

【当前笔记内容】
${currentContent}

【修改建议】
${suggestion}

请根据修改建议调整笔记内容，保持原有的风格和结构，只调整建议中提到的部分。

直接返回修改后的内容，不要有任何解释。`;

    return await callAI(prompt, 0.8, 1500);
}
