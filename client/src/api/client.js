const API_BASE_URL = '/api';

export const getAuthToken = () => {
  return localStorage.getItem('plusticket_token');
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('plusticket_token', token);
  } else {
    localStorage.removeItem('plusticket_token');
  }
};

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Tratar respostas sem conteúdo (ex: 204)
    if (response.status === 204) {
      return { success: true };
    }

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // Se a resposta for o erro de proxy do Webpack (servidor backend offline)
      if (responseText.includes('Error occurred while trying to proxy') || response.status === 504) {
        throw new Error('Servidor backend offline. Por favor, inicie a API com "npm start" no terminal raiz.');
      }
      throw new Error(`Resposta inválida do servidor (${response.status})`);
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || 'Erro ao processar requisição';
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}
