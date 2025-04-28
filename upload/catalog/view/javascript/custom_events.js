
// Carrega dinamicamente o script do MailBiz
window.addEventListener("load", function (event) {
  // Function to make HTTP requests
  async function makeRequest(url, options = {}) {
    try {
      // Set default options
      const defaultOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };
  
      // Merge default options with provided options
      const requestOptions = {
        ...defaultOptions,
        ...options
      };
  
      // Make the request
      const response = await fetch(url, requestOptions);
  
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      // Parse and return the JSON response
      const data = await response.json();
      return {
        success: true,
        data
      };
  
    } catch (error) {
      console.error('Request failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Usage example:
  /*
  https://demo.vowt.dev.br/teste-guilherme/?route=extension/module/custom_events/getCustomerApi
  makeRequest('https://api.example.com/data', {
    method: 'POST',
    body: JSON.stringify({
      key: 'value'
    })
  }).then(result => {
    if (result.success) {
      console.log('Data:', result.data);
    } else {
      console.error('Error:', result.error);
    }
  });
  */
    const el = document.querySelector('[data-custom-events-token]');
    const url_userData = el.getAttribute('data-base-url');
    const url_userData_api = url_userData + '?route=extension/module/custom_events/getCustomerApi';
    const url_get_cart_products = url_userData + '?route=extension/module/custom_events/getCartProductsApi';
  
    let customerData = null;
    let isLogged = false;
    // const isLogged = el.getAttribute('data-customer-is-logged') === 'true';
  
    const getCustomer = async () => {
      try {
        const options = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        const response = await makeRequest(url_userData_api, options);
        if (response.success === false) {
          // isLogged = false;
          throw new Error(`HTTP error! status: ${response.error}`);
        }
        console.log('Dados do cliente -2:', response.data.customer);
        // customerData = response.data.customer;
        // isLogged = true;
        return response
      } catch (error) {
        throw error;
      }    
    }
    
  
    getCustomer().then(result => {
      if (result.data.customer){
        customerData = result.data.customer;
        isLogged = true;
        console.log('Dados do cliente -4:', customerData);
        const eventData = {
          user: {
            user_id: result.data.customer.customer_id,
            email: result.data.customer.email,
            phone: result.data.customer.telephone,
            name: result.data.customer.firstname + ' ' + result.data.customer.lastname
          }
        }
        sendAccountSyncEvent(eventData)
      };
    });
    
    // setTimeout(() => {
      const isDebug = true;
      if (isDebug) {
        console.log('MailbizIntegration:: Carregando o script do MailBiz em modo debug');
      }
      
      
      if (!el) {
        if (isDebug) {
          console.error('MailbizIntegration:: Elemento com data-custom-events-token não encontrado');
          return;
        }
      }
  
      // Lê os dados do elemento
      const cartData = JSON.parse(el.getAttribute('data-cart') || '{}');
      // const customerData = JSON.parse(el.getAttribute('data-customer-data') || '{}');
      // const productsData = JSON.parse(el.getAttribute('data-products') || '[]');
      const totalsData = JSON.parse(el.getAttribute('data-totals') || '{}');
        const totalDataTotal = totalsData.totals.filter(total => total.title === "Total")[0].text;
        const totalDataCupom = totalsData.totals.filter(total => total.title.startsWith("Cupom"))[0]?.text || "";
        const totalDataSubTotal = totalsData.totals.filter(total => total.title === "Sub-total")[0].text;
      const hasProducts = el.getAttribute('data-has-products') === 'true';
      const hasShipping = el.getAttribute('data-has-shipping') === 'true';
      const hasDownload = el.getAttribute('data-has-download') === 'true';
      const hasStock = el.getAttribute('data-has-stock') === 'true';
      const countProducts = parseInt(el.getAttribute('data-count-products') || '0');
      const valorCupom = document.querySelector('[name="coupon"]') 
        ? document.querySelector('[name="coupon"]').value
        : "";
      
      const token = el.getAttribute('data-custom-events-token');
      // const isLogged = el.getAttribute('data-customer-is-logged') === 'true';
  
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
      function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
      }
      const currentRoute = getQueryParam('route');
      const isCheckoutPage = currentRoute === 'extension/module/checkoutpro/checkout';
      const isCartPage = currentRoute === 'extension/module/cart/page';
      
      if (isDebug) {
        console.log('MailbizIntegration:: Rota atual:', currentRoute);
        console.log('MailbizIntegration:: É página de checkout:', isCheckoutPage);
        console.log('MailbizIntegration:: É página do carrinho:', isCartPage);
      }
      // Verifica se o usuário está logado e envia os dados
      function sendAccountSyncEvent(eventData) {
        console.log('MailbizIntegration:: 1.1 - Enviando evento accountSync', eventData);
        console.log('MailbizIntegration:: 1.2 - Enviando evento accountSync', eventData);
        window.mb_track('accountSync', eventData);
      }
      
      function sendCartSyncEvent() {
        const getProducts = async () => {
          try {
            const options = {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            };
            const response = await makeRequest(url_get_cart_products, options);
            if (response.success === false) {
              throw new Error(`HTTP error! status: ${response.error}`);
            }
            console.log('Dados do cliente -2:', response.data.customer);
            return response
          } catch (error) {
            throw error;
          }    
        }
        getProducts().then(result => {
          console.log('dados de produtos do carrinho - 1:', result.data.products);
          console.log('dados de produtos do carrinho - 1:', result.data.total_amount_raw);
          console.log('dados de produtos do carrinho - 1:', result.data.total_items);
          // Prepara o objeto para o evento cartSync
          const cartSyncData = {
            cart: {
                cart_id: result.data.products[0].cart_id,
                coupons: result.data.coupon.code,
                subtotal: totalDataSubTotal,
                freight: -1,
                tax: -1,
                discounts: Math.abs(result.data.coupon.discount) || -1,
                total: result.data.total_amount_raw,
                items: result.data.products.map(product => ({
                    product_id: product.product_id,
                    sku: product.sku || product.product_id,
                    name: product.name,
                    price: product.price_raw,
                    quantity: parseInt(product.quantity),
                    image_url: product.image || '',
                }))
            }
          };
          // Dispara o evento cartSync
          window.mb_track('cartSync', cartSyncData);
          if (isDebug) {
            console.log('MailbizIntegration:: 2.1 Evento cartSync disparado pelo offcanvas', cartSyncData);
          }
        })
      }
      
      // if (typeof addToCart === "function") {
      //   // Intercepta a função addToCart
      //   const interceptedAddToCart = addToCart;
  
      //   // Redefinir a função com um wrapper
      //   addToCart = function(...args) {
      //     // Executa a função original primeiro
      //     const result = interceptedAddToCart.apply(this, args);
  
      //     // Prepara o objeto para o evento cartSync
      //     const cartSyncData = {
      //         cart: {
      //             cart_id: productsData[0].cart_id,
      //             subtotal: totalDataSubTotal,
      //             freight: -1,
      //             tax: -1,
      //             discounts: Math.abs(totalDataCupom) || -1,
      //             total: totalDataTotal,
      //             coupons: valorCupom,
      //             items: productsData.map(product => ({
      //                 product_id: product.product_id,
      //                 sku: product.sku || product.product_id,
      //                 name: product.name,
      //                 price: parseFloat(product.price.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()),
      //                 quantity: parseInt(product.quantity),
      //                 image_url: product.image || '',
      //             }))
      //         }
      //     };
  
      //     // Dispara o evento cartSync
      //     window.mb_track('cartSync', cartSyncData);
      //     console.log('MailbizIntegration:: 2.1 - Evento cartSync disparado', cartSyncData);
          
      //     return result;
      //   };
      // }
      // Evento de fechar abrir o carrinho 
      var myOffcanvas = document.getElementById('offcanvasCart')
        
      myOffcanvas.addEventListener('hide.bs.offcanvas', function () {
        sendCartSyncEvent();
      });
      
      // if (typeof getCart === "function") {
      //   // Intercepta a função getCart
      //   const interceptedGetCart = getCart;
      //   const result = interceptedGetCart.apply(this, args);
      //   console.log('resultado da função getCart:');
      //   // Redefinir a função com um wrapper
      //   sendCartSyncEvent();
      //   return result;
      // }
      Cart.on('loaded_cart', function(html) {
        sendCartSyncEvent();
      });
    
      if (isCartPage) {
        sendCartSyncEvent();
      }
  
      
    // }, 1000); // Espera 1 segundo antes de tentar
  });
  //extension/module/checkoutpro/checkout