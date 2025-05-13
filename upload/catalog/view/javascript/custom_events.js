
// Carrega dinamicamente o script do MailBiz
window.addEventListener("load", function (event) {
	const isDebug = true;

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
				console.error(`HTTP error! status: ${response.status}`);
			}
			
			// Parse and return the JSON response
			const data = await response.json();
			return {
				success: true,
				data
			};
			
		} catch (error) {
			if (isDebug) {
				// throw error;
				console.error('Request failed:', error);
			}
			return {
				success: false,
				error: error.message
			};
		}
	}
	
	const el = document.querySelector('[data-custom-events-token]');
	const url_userData = el.getAttribute('data-base-url');
	const url_userData_api = url_userData + '?route=extension/module/custom_events/getCustomerApi';
	const url_get_cart_products = url_userData + '?route=extension/module/custom_events/getCartProductsApi';
	const url_get_last_order = url_userData + '?route=extension/module/custom_events/getLastOrderApi';
	const url_post_add_product = url_userData + '?route=checkout/cart/add';
	
	// Dados do cliente
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
				console.log('Request failed:', response.error);
			}
			return response
		} catch (error) {
			if (isDebug) {
				console.log('Request failed:', error);
			}
			return
		}    
	}
	
	getCustomer()
	.then(result => {
		if (result?.data?.customer) {
			const eventData = {
				user: {
					user_id: result.data.customer.customer_id,
					email: result.data.customer.email,
					phone: result.data.customer.telephone,
					name: result.data.customer.firstname + ' ' + result.data.customer.lastname
				}
			}
			sendAccountSyncEvent(eventData)
		}
	})
	.catch(error => {
		if (isDebug) {
			throw error;
		}
		return;
	});
	
	
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
	
	if (cartData && cartData.products && cartData.products.length > 0) {
		sessionStorage.setItem('cart_id', cartData.products[0].cart_id);
	}
	
	const totalsData = JSON.parse(el.getAttribute('data-totals') || '{}');
	const totalDataSubTotal = totalsData.totals.filter(total => total.title === "Sub-total")[0].text;
	const token = el.getAttribute('data-custom-events-token');
	const dataOcRoute = el.getAttribute('data-oc-route');
	
	if (isDebug) {
		console.log('MailbizIntegration:: Carregando o script do MailBiz', token, dataOcRoute);
	}
	
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
	const isProductPage = currentRoute === 'product/product' || dataOcRoute === 'product/product';
	
	if (isProductPage) {
		sendProductViewEvent();
	}
	
	if (isDebug) {
		console.log('MailbizIntegration:: Rota atual:', currentRoute);
		console.log('MailbizIntegration:: É página de checkout:', isCheckoutPage);
		console.log('MailbizIntegration:: É página do carrinho:', isCartPage);
		console.log('MailbizIntegration:: É página do produto:', isProductPage);
	}
	
	// Verifica se o usuário está logado e envia os dados
	function sendAccountSyncEvent(eventData) {
		console.log('MailbizIntegration:: 1.1 - Enviando evento accountSync', eventData);
		console.log('MailbizIntegration:: 1.2 - Enviando evento accountSync', eventData);
		window.mb_track('accountSync', eventData);
	}
	
	// Função para buscar a categoria do produto
	async function getProductCategory(productId) {
		try {
			const response = await makeRequest(`${url_userData}?route=extension/module/custom_events/getCategoryByProductApi&product_id=${productId}`);
			
			if (response.success === false) {
				throw new Error(`HTTP error! status: ${response.error}`);
			}
			if (isDebug) {
				console.log('MailbizIntegration:: Categoria do produto:', response.data);
			}
			return response;
		} catch (error) {
			console.error('Erro ao buscar categoria do produto:', error);
			throw error;
		}
	}
	
	// Função para buscar as variaçoes do produto
	async function getProductVariants(masterID) {
		try {
			const response = await makeRequest(`${url_userData}?route=extension/module/custom_events/productVariationsApi&product_id=${masterID}`);

			if (response.success === false) {
				throw new Error(`HTTP error! status: ${response.error}`);
			}
			if (isDebug) {
				console.log('MailbizIntegration:: Variações do produto:', response.data);
			}
			return response;
		} catch (error) {
			console.error('Erro ao buscar variações do produto:', error);
			throw error;
		}
	}
	
	// Evento para disparo do evento productView
	async function sendProductViewEvent() {
		if (isDebug) {
			console.log('MailbizIntegration:: 7.0 - Enviando evento productView');
		}
		
		const productId = el.getAttribute('data-product-id');
		const masterID = el.getAttribute('data-master-id');
		
		const categoryResponse = await getProductCategory(productId);
		const variantsResponse = await getProductVariants(masterID || productId);

		if (isDebug) {
			console.log('MailbizIntegration:: 7.1 - Enviando evento productView com as variantes', variantsResponse, masterID);
			console.log('MailbizIntegration:: 7.1 - Enviando evento productView com a categoria', categoryResponse, productId);
		}
		
		const productViewEventData = {
			product: {
				product_id: el.getAttribute('data-product-id'),
				url: window.location.href,
				category: categoryResponse?.data?.category || 'sem categoria',
				variants: variantsResponse?.data?.variants || [],
			}
		}
		
		window.mb_track('productView', productViewEventData);
		
		if (isDebug) {
			console.log('MailbizIntegration:: 7.1 - Enviando evento productView', productViewEventData);
		}
	}
	
	function sendCartSyncEvent(forced_cart_id = null) {
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
		getProducts()
			.then(result => {
				if (forced_cart_id === null) {
					const url_userData = el.getAttribute('data-base-url');
					const complete_image_url = (image) => image ? url_userData + 'image/' + image : '';

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
								image_url: complete_image_url(product.image),
							}))
						}
					};
					window.mb_track('cartSync', cartSyncData);
					if (isDebug) {
						console.log('MailbizIntegration:: cartSync', cartSyncData);
					}
				}
				if (forced_cart_id) {
					const cartSyncData_forced = {
						cart: {
							cart_id: forced_cart_id,
							coupons: "",
							subtotal: 0,
							freight: -1,
							tax: -1,
							discounts: -1,
							total: 0,
							items: []
						}
					};
					if (isDebug) {
						console.log('MailbizIntegration:: cartSync for clear all!', forced_cart_id, cartSyncData_forced);
					}
					window.mb_track('cartSync', cartSyncData_forced);
				}
			});
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
	
	// Evento para disparo do accountSync
	if (isCheckoutPage) {
		// Função de debounce
		function debounce(func, wait) {
			let timeout;
			return function executedFunction(...args) {
				const later = () => {
					clearTimeout(timeout);
					func(...args);
				};
				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
			};
		}
		setTimeout(() => {
			const emailInput = document.getElementById('input-email');
			console.log(emailInput)
			if (emailInput) {
				const handleEmailChange = debounce(function(e) {
					const registerEventData = {
						user: {
							email: e.target.value
						}
					};
					if (isDebug) {
						console.warn('MailbizIntegration:: 10.1 Email input change event triggered', registerEventData);
					}
					window.mb_track('accountSync', registerEventData);
				}, 500);
	
				emailInput.addEventListener('input', handleEmailChange);
				emailInput.addEventListener('change', handleEmailChange);
				emailInput.addEventListener('blur', handleEmailChange);
				emailInput.addEventListener('paste', handleEmailChange);
			} else {
				console.error('MailbizIntegration:: Elemento de input de email não encontrado');
			}
		}, 500);
		
	}
	
	Cart.on('loaded_cart', function(html) {
		sendCartSyncEvent();
	});
	
	if (isCartPage) {
		sendCartSyncEvent();
	}
	
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
		const complete_image_url = (image) => image ? url_userData + 'image/' + image : '';
		
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
					image_url: complete_image_url(product.image),
				}))
			}
			// delivery object
			getCustomer()
			.then(resultCustomer => {
				const delivery_address = {
					postal_code: resultCustomer.data.address.postcode.replace('-', ''),
					city: resultCustomer.data.address.city,
					country: resultCustomer.data.address.country,
					address_line1: resultCustomer.data.address.address_1,
					address_line2: resultCustomer.data.address.address_2
				}
				const orderCompleteEventData = {
					order: {
						order_id: result.data.order.order_id,
						cart_id: mailbiz_cart_id || cart_id || sessionStorage.getItem('cart_id'),
						subtotal: Number(result.data.order.total),
						freight: -1,
						tax: -1,
						discounts: -1,
						total: Number(result.data.order.total),
						...orderCompleteItemsData,
						delivery_address: delivery_address
					}
				}
				window.mb_track('orderComplete', orderCompleteEventData);
				
				if (isDebug) {
					console.log('MailbizIntegration:: 4.1 orderComplete()', orderCompleteEventData)
				}
			})
		})
		.finally(() => {
			sessionStorage.removeItem('cart_id');
		});
	}
	

	Cart.on('updated', function(arg) { 
		if (isDebug) {
			console.log("MailbizIntegration:: 13.1 Cart updated", arg)
		}
		sendCartSyncEvent();
	});
	
	Cart.on('added', function(arg) {
		if (isDebug) {
			console.log("MailbizIntegration:: 11.1 Cart added", arg)
		}
		sendCartSyncEvent();
	})
	
	
	Cart.on('removed', (param) => {

	
	})
	
	const originalRemove = Cart.remove;
	Cart.remove = function(id) {
		console.log('integracao quando nao houver mais produtos', id);
		
		return originalRemove.call(this, id).then((a) => {
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
			getProducts()
			.then(result => {
				if (result.data.products.length > 0) {
					sendCartSyncEvent();
				} else {
					sendCartSyncEvent(id);
				}
			});
		});
	}

	// no carrinho ao inserir o cep dispara o evento cartSetPostalCode
	$(document).on('click', '#button-quote', function(e) {
        const postcode = $('input[name="postcode"]').val().replace("-", "");
		const cart_id = sessionStorage.getItem('cart_id');
    
        window.mb_track('cartSetPostalCode', {
			cart_id,
			postal_code: postcode,
        });

		if (isDebug) {
			console.log('MailbizIntegration:: 31.1 cartSetPostalCode()', `postcode: ${postcode} `, `cart_id: ${cart_id}`)
		}
	});

	// no carrinho ao inserir o cupom dispara o evento cartSetCoupon
	$(document).on('click', '#button-coupon', function() {
		const cupom = $('input[name="coupon"]').val();
		const cart_id = sessionStorage.getItem('cart_id');

		if (isDebug) {
			console.log('MailbizIntegration:: 32.1 cartSetCoupon()', `cupom: ${cupom} `, `cart_id: ${cart_id}`)
		}

		window.mb_track('cartSetCoupon', {
			cart_id,
			coupon: cupom,
		});
	});
	
	console.log('clicou no login', currentRoute);
	
	const validStepNames = [
		'IDENTIFICATION',
		'REGISTER',
		'REGISTER_DELIVERY',
		'DELIVERY',
		'PAYMENT',
		'CONFIRM_ORDER'
	];
	
	function sendCheckoutStepEvent(cartId, step, stepName) {
		if (!validStepNames.includes(stepName)) {
			if (isDebug) {
				console.error('Invalid step name. Must be one of:', validStepNames.join(', '));
			}
			return;
		}

		const TOTAL_STEPS = 6;

		const checkoutEventData = {
			checkout: {
				cart_id: cartId,
				step: step,
				total_steps: TOTAL_STEPS,
				step_name: stepName
			}
		};

		if (isDebug) {
			console.log('MailbizIntegration:: Sending checkoutStep event', checkoutEventData);
		}

		window.mb_track('checkoutStep', checkoutEventData);
	}
	
	$( document ).ready(function() {
		// IDENTIFICATION
		const checkLoginButton = () => {
			const loginBtn = $('#button-login');
			if (loginBtn.length) {
				console.log('MailbizIntegration:: loginBtn encontrado');
				if (cartData && cartData.products && cartData.products.length > 0) {
					sendCheckoutStepEvent(cartData.products[0].cart_id, 1, 'IDENTIFICATION');
				} else {
					console.warn('MailbizIntegration:: cartData não está disponível ainda');
				}
			} else {
				console.log('MailbizIntegration:: loginBtn não encontrado, tentando novamente...');
				setTimeout(checkLoginButton, 1000);
			}
		};
		checkLoginButton();
		
		// REGISTER
		const registerButton = () => {
			const registerBtn = $('#button-register');
			if (registerBtn.length) {
				console.log('MailbizIntegration:: registerBtn encontrado');
				if (cartData && cartData.products && cartData.products.length > 0) {
					sendCheckoutStepEvent(cartData.products[0].cart_id, 2, 'REGISTER');
				} else {
					console.warn('MailbizIntegration:: cartData não está disponível ainda');
				}
			} else {
				console.log('MailbizIntegration:: registerBtn não encontrado, tentando novamente...');
				setTimeout(registerButton, 1000);
			}
		}
		registerButton();

		// REGISTER_DELIVERY
		const registerDeliveryButton = () => {
			const registerDeliveryBtn = $('#button-shipping-address');
			if (registerDeliveryBtn.length) {
				console.log('MailbizIntegration:: registerDeliveryBtn encontrado');
				if (cartData && cartData.products && cartData.products.length > 0) {
					sendCheckoutStepEvent(cartData.products[0].cart_id, 3, 'REGISTER_DELIVERY');
				} else {
					console.warn('MailbizIntegration:: cartData não está disponível ainda');
				}
			} else {
				console.log('MailbizIntegration:: registerDeliveryBtn não encontrado, tentando novamente...');
				setTimeout(registerDeliveryButton, 1000);
			}
		}
		registerDeliveryButton();

		// DELIVERY
		const deliveryButton = () => {
			const deliveryBtn = $('#button-shipping-method');
			if (deliveryBtn.length) {
				console.log('MailbizIntegration:: deliveryBtn encontrado');
				if (cartData && cartData.products && cartData.products.length > 0) {
					sendCheckoutStepEvent(cartData.products[0].cart_id, 4, 'DELIVERY');
				} else {
					console.warn('MailbizIntegration:: cartData não está disponível ainda');
				}
			} else {
				console.log('MailbizIntegration:: deliveryBtn não encontrado, tentando novamente...');
				setTimeout(deliveryButton, 1000);
			}
		}
		deliveryButton();

		// PAYMENT
		const paymentButton = () => {
			const paymentBtn = $('#button-payment-method');
			if (paymentBtn.length) {
				console.log('MailbizIntegration:: paymentBtn encontrado');
				if (cartData && cartData.products && cartData.products.length > 0) {
					sendCheckoutStepEvent(cartData.products[0].cart_id, 5, 'PAYMENT');
				} else {
					console.warn('MailbizIntegration:: cartData não está disponível ainda');
				}
			} else {
				console.log('MailbizIntegration:: paymentBtn não encontrado, tentando novamente...');
				setTimeout(paymentButton, 1000);
			}
		}
		paymentButton();
		
		// CONFIRM_ORDER
		const confirmOrderButton = () => {
			const confirmOrderBtn = $('#button-confirm');
			if (confirmOrderBtn.length) {
				console.log('MailbizIntegration:: confirmOrderBtn encontrado');
				if (cartData && cartData.products && cartData.products.length > 0) {
					sendCheckoutStepEvent(cartData.products[0].cart_id, 6, 'CONFIRM_ORDER');
				} else {
					console.warn('MailbizIntegration:: cartData não está disponível ainda');
				}
			} else {
				console.log('MailbizIntegration:: confirmOrderBtn não encontrado, tentando novamente...');
				setTimeout(confirmOrderButton, 1000);
			}
		}
		confirmOrderButton();
	});
});