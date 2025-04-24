
// Carrega dinamicamente o script do MailBiz
window.addEventListener("load", function (event) {
  setTimeout(() => {
    const el = document.querySelector('[data-custom-events-token]');
    
    if (!el) {
      console.error('MailbizIntegration:: Elemento com data-custom-events-token não encontrado');
      return;
    }

    const token = el.getAttribute('data-custom-events-token');

    console.log('MailbizIntegration:: Carregando o script do MailBiz', token);

    // Universal Tracker
    (function (m, a) {
      if (!m[a]) {
        m[a] = function () { ;(m[a].q = m[a].q || []).push(arguments) }
        m[a].q = m[a].q || []
      }
    })(window, 'mb_track');


    // Universal recover cart 
    (function (m, a) {
      if (m[a]) { return; }
      m[a] = function (arg) {
          // var cartId = arg.cart_id;
          // var userId = arg.user_id;
          // var products = arg.products;
        
          // // eg: recover cart trough an API
          // var response = await fetch("https://example.com/cart", {
          //   method: "POST",
          //   body: JSON.stringify(products.map((p) => p.sku));
          // });
            
          // products.forEach(function (product) {
          //     var productId = product.product_id;
          //     var sku = product.sku;
          //     var quantity = product.quantity;
          //     var recoveryProperties = product.recovery_properties;
            
          //     // eg: add products to cart trough helper function
          //     example.addToCart(productId, sku, quantity, recoveryProperties.someData)
          // });
      };
    })(window, 'mb_recover_cart');


    // Hub Mailbiz
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
        token
    );


  }, 1000); // Espera 1 segundo antes de tentar
});