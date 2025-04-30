
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
    const url_get_last_order = url_userData + '?route=extension/module/custom_events/getLastOrderApi';
    const url_post_add_product = url_userData + '?route=checkout/cart/add';
  
    let customerData = null;
    let isLogged = false;
  
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
          throw new Error(`HTTP error! status: ${response.error}`);
        }
        console.log('Dados do cliente -2:', response.data.customer);
        return response
      } catch (error) {
        throw error;
      }    
    }
    
  
    getCustomer().then(result => {
      if (result.data.customer){
        customerData = result.data.customer;
        isLogged = true;
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
      const totalsData = JSON.parse(el.getAttribute('data-totals') || '{}');
      const totalDataSubTotal = totalsData.totals.filter(total => total.title === "Sub-total")[0].text;
      
      const token = el.getAttribute('data-custom-events-token');
  
      console.log('MailbizIntegration:: Carregando o script do MailBiz', token);
  
      // Universal Tracker
      (function (m, a) {
        if (!m[a]) {
          m[a] = function () { ;(m[a].q = m[a].q || []).push(arguments) }
          m[a].q = m[a].q || []
        }
      })(window, 'mb_track');
  
      mb_track('setRecoveryUrl', `${url_userData}?route=extension/module/cart/page`);

      // Universal recover cart 
      (function (m, a) {
        if (m[a]) { return; }
        m[a] = function (arg) {
          var cartId = arg.cart_id;
          var userId = arg.user_id;
          var products = arg.products;
          if (isDebug) {
            console.warn('0.0 - Cart recovery event', cartId, userId, products);
          }
          if (cartId) {
            // adiciona ao session o mailbiz_cart_id
            sessionStorage.setItem('mailbiz_cart_id', cartId);
            console.warn('0.1 - Cart recovery event', cartId, userId, products);
          }
          const addToCart = async (product_id, quantity) => {
            try {
              const options = {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `product_id=${parseInt(product_id)}&quantity=${quantity}`
              };
              const response = await makeRequest(url_post_add_product, options);
              return response
            } catch (error) {
              throw error;
            }    
          }

          const addToCartPromises = products.map(product => 
            addToCart(product.product_id, product.quantity)
          );
          
          Promise.all(addToCartPromises)
            .then(() => {
              // Redirect to cart page after all products are added
              window.location.href = `${url_userData}?route=extension/module/cart/page`;
            })
            .catch(error => {
              console.error('Error adding products to cart:', error);
            });
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
      const isSuccessPage = currentRoute === 'checkout/success';

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
            return response
          } catch (error) {
            throw error;
          }    
        }
        getProducts().then(result => {
          // Prepara o objeto para o evento cartSync
          const cartSyncData = {
            cart: {
                cart_id: result.data.products[0].cart_id,
                coupons: result.data?.coupon ? result.data.coupon.code : "",
                subtotal: totalDataSubTotal,
                freight: -1,
                tax: -1,
                discounts: result.data.coupon ? Math.abs(result.data.coupon?.discount) : -1,
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

      /**
       * 
       *
       * @description Eventos de interface responsaveis por disparo de eventos para o Mailbiz
       *
       */
      var myOffcanvas = document.getElementById('offcanvasCart')
      if (myOffcanvas) {
        myOffcanvas.addEventListener('hide.bs.offcanvas', function () {
          sendCartSyncEvent();
        });
      }


      Cart.on('loaded_cart', function(html) {
        sendCartSyncEvent();
      });
    
      if (isCartPage) {
        sendCartSyncEvent();
      }

      if (isCheckoutPage) {
        const checkoutEventData = {
          checkout: {
            cart_id: cartData.products[0].cart_id,
            step: 1,
            total_steps: 1,
            step_name: 'CHECKOUT',
          }
        };

        sessionStorage.setItem('cart_id', cartData.products[0].cart_id);
        
        if (isDebug) {
          console.log('MailbizIntegration:: 3.1 checkoutStep() - ischeckoutPage true then send checkout step', checkoutEventData)
        }
        window.mb_track('checkoutStep', checkoutEventData);
      };

      if (isSuccessPage) {
        const cart_id = sessionStorage.getItem('cart_id');
        const mailbiz_cart_id = sessionStorage.getItem('mailbiz_cart_id');
        
        const getLastOrder = async () => {
          try {
            const options = {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            };
            const response = await makeRequest(url_get_last_order, options);
            if (response.success === false) {
              throw new Error(`HTTP error! status: ${response.error}`);
            }
            return response
          } catch (error) {
            throw error;
          }    
        }

        getLastOrder()
          .then(result => {
            console.log('dados last order', result);
            const orderCompleteItemsData = {
              items: result.data.order.products.map(product => ({
                product_id: product.product_id,
                sku: product.sku || product.product_id,
                name: product.name,
                price: product.price,
                quantity: parseInt(product.quantity),
              }))
            }
    
            const orderCompleteEventData = {
              order: {
                order_id: result.data.order.order_id,
                cart_id: mailbiz_cart_id || cart_id,
                subtotal: Number(result.data.order.total),
                freight: -1,
                tax: -1,
                discounts: -1,
                total: Number(result.data.order.total),
                ...orderCompleteItemsData
              }
            }
          
            window.mb_track('orderComplete', orderCompleteEventData);

            if (isDebug) {
              console.log('MailbizIntegration:: 4.1 orderComplete()', orderCompleteEventData)
            }


          })
          .finally(() => {
            sessionStorage.removeItem('cart_id');
          });
      }
  });
  //extension/module/checkoutpro/checkout