document.addEventListener('DOMContentLoaded', function() {
    // Obtém o token do módulo do elemento data
    var token = document.querySelector('[data-custom-events-token]').getAttribute('data-custom-events-token');

    // Objeto para gerenciar os eventos
    var CustomEvents = {
        token: token,

        // Função para enviar eventos
        sendEvent: function(eventName, eventData) {
            if (!this.token) {
                console.error('Token não configurado para Custom Events');
                return;
            }

            var data = {
                event: eventName,
                data: eventData,
                token: this.token,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };

            // Aqui você pode implementar o envio do evento para seu backend ou serviço de analytics
            console.log('Evento capturado:', data);
        },

        // Inicializa os listeners de eventos
        init: function() {
            var self = this;

            // Exemplo: Captura cliques em produtos
            document.addEventListener('click', function(e) {
                var productElement = e.target.closest('[data-product-id]');
                if (productElement) {
                    self.sendEvent('product_click', {
                        product_id: productElement.getAttribute('data-product-id')
                    });
                }
            });

            // Exemplo: Captura adições ao carrinho
            if (typeof cart !== 'undefined') {
                var originalAdd = cart.add;
                cart.add = function(product_id, quantity) {
                    self.sendEvent('add_to_cart', {
                        product_id: product_id,
                        quantity: quantity
                    });
                    return originalAdd.apply(this, arguments);
                };
            }

            console.log('Custom Events inicializado com sucesso');
        }
    };

    // Inicializa o módulo
    CustomEvents.init();

    // Expõe o objeto globalmente para uso externo
    window.CustomEvents = CustomEvents;
    
});

// Carrega dinamicamente o script do MailBiz
(function(m, a, i, l, b, z, j, s) {

    m['MailbizIntegration'] = {
      id: b,
      ready: 0
    };
    z = a.createElement(i);
    j = a.getElementsByTagName(i)[0];
    z.async = 0;
    z.src = l;
    j.parentNode.insertBefore(z, j);
})(
    window,
    document,
    'script',
    'https://d3eq1zq78ux3cv.cloudfront.net/static/scripts/integration.min.js',
    document.querySelector('[data-custom-events-token]').getAttribute('data-custom-events-token')
);
    