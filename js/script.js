const visor = document.getElementById('visor');
const teclado = document.querySelector('.teclado');

const OPERADORES = ['+', '-', '*', '/'];

// Função auxiliar para rolar o visor para o final (extrema direita)
function rolarVisorParaFinal() {
    visor.scrollLeft = visor.scrollWidth;
}

// --- 1. OUVINTES DE EVENTOS (Regras de Negócio e Operações) ---

// Evento para adicionar um caractere (número, ponto ou operador)
document.addEventListener('calculadora:adicionar', (event) => {
    const valor = event.detail;
    const ultimoChar = visor.value.slice(-1);

    // Regra 1: Evita dois operadores em sequência
    if (OPERADORES.includes(ultimoChar) && OPERADORES.includes(valor)) {
        visor.value = visor.value.slice(0, -1) + valor;
        rolarVisorParaFinal();
        return;
    }

    // Regra 2: Impede múltiplos pontos decimais no mesmo número
    if (valor === '.') {
        const partes = visor.value.split(/[\+\-\*\/]/);
        const ultimoNumero = partes[partes.length - 1];
        if (ultimoNumero.includes('.')) return;
    }

    visor.value += valor;
    rolarVisorParaFinal();
});

// Evento para limpar o visor
document.addEventListener('calculadora:limpar', () => {
    visor.value = '';
    rolarVisorParaFinal();
});

// Evento para apagar o último caractere
document.addEventListener('calculadora:apagar', () => {
    visor.value = visor.value.slice(0, -1);
    rolarVisorParaFinal();
});

// Evento para aplicar porcentagem
document.addEventListener('calculadora:porcentagem', () => {
    if (visor.value === '') return;
    try {
        const resultado = eval(visor.value) / 100;
        visor.value = resultado;
        rolarVisorParaFinal();
    } catch {
        document.dispatchEvent(new CustomEvent('calculadora:erro', { detail: 'Erro' }));
    }
});

// Evento para calcular o resultado final (Avaliação sequencial da esquerda para a direita)
document.addEventListener('calculadora:calcular', () => {
    if (visor.value.trim() === '') return;

    try {
        let expressao = visor.value
            .replace(/,/g, '.')
            .replace(/x/gi, '*')
            .replace(/÷/g, '/');

        // Regra de Validação: Divisão por zero
        if (/\/0(?!\d)/.test(expressao)) {
            document.dispatchEvent(new CustomEvent('calculadora:erro', { detail: 'Erro: Div/0' }));
            return;
        }

        // Separa os números e os operadores mantendo a ordem sequencial
        const tokens = expressao.match(/(\d+\.?\d*)|([\+\-\*\/])/g);

        if (!tokens) {
            document.dispatchEvent(new CustomEvent('calculadora:erro', { detail: 'Expressão Inválida' }));
            return;
        }

        // Avalia da esquerda para a direita acumulando o resultado
        let resultado = parseFloat(tokens[0]);

        for (let i = 1; i < tokens.length; i += 2) {
            const operador = tokens[i];
            const proximoNumero = parseFloat(tokens[i + 1]);

            if (isNaN(proximoNumero)) break;

            switch (operador) {
                case '+':
                    resultado += proximoNumero;
                    break;
                case '-':
                    resultado -= proximoNumero;
                    break;
                case '*':
                    resultado *= proximoNumero;
                    break;
                case '/':
                    if (proximoNumero === 0) {
                        document.dispatchEvent(new CustomEvent('calculadora:erro', { detail: 'Erro: Div/0' }));
                        return;
                    }
                    resultado /= proximoNumero;
                    break;
            }
        }

        // Tratamento de resultados numéricos válidos
        if (!isFinite(resultado) || Number.isNaN(resultado)) {
            document.dispatchEvent(new CustomEvent('calculadora:erro', { detail: 'Erro: Div/0' }));
            return;
        }

        // Arredonda dízimas longas
        if (!Number.isInteger(resultado)) {
            resultado = parseFloat(resultado.toFixed(8));
        }

        visor.value = resultado;
        rolarVisorParaFinal();
    } catch (erro) {
        document.dispatchEvent(new CustomEvent('calculadora:erro', { detail: 'Expressão Inválida' }));
    }
});

// Evento para exibição de erros
document.addEventListener('calculadora:erro', (event) => {
    visor.value = event.detail;
    rolarVisorParaFinal();
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('calculadora:limpar'));
    }, 1500);
});


// --- 2. EMISSORES DE EVENTOS (Entradas do Usuário) ---

// Dispara os eventos a partir dos cliques no teclado virtual
teclado.addEventListener('click', (event) => {
    const botao = event.target.closest('button');
    if (!botao) return;

    const valor = botao.getAttribute('data-val');
    const acao = botao.getAttribute('data-acao');

    if (valor) {
        document.dispatchEvent(new CustomEvent('calculadora:adicionar', { detail: valor }));
    } else if (acao) {
        document.dispatchEvent(new CustomEvent(`calculadora:${acao}`));
    }
});

// Dispara os eventos a partir da digitação no teclado físico
document.addEventListener('keydown', (event) => {
    const tecla = event.key;

    if (/[0-9\+\-\*\/]/.test(tecla)) {
        document.dispatchEvent(new CustomEvent('calculadora:adicionar', { detail: tecla }));
    } else if (tecla === ',' || tecla === '.') {
        document.dispatchEvent(new CustomEvent('calculadora:adicionar', { detail: '.' }));
    } else if (tecla === '%') {
        document.dispatchEvent(new CustomEvent('calculadora:porcentagem'));
    } else if (tecla === 'Backspace') {
        document.dispatchEvent(new CustomEvent('calculadora:apagar'));
    } else if (tecla === 'Escape' || tecla.toLowerCase() === 'c') {
        document.dispatchEvent(new CustomEvent('calculadora:limpar'));
    } else if (tecla === 'Enter' || tecla === '=') {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('calculadora:calcular'));
    }
});