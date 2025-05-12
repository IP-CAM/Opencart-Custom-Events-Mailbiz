<?php
class ControllerExtensionModuleCustomEvents extends Controller {
    public function load_cart_total() {
        $this->load->model('setting/extension');

        $totals = array();
        $taxes = $this->cart->getTaxes();
        $total = 0;
        
        // Because __call can not keep var references so we put them into an array. 			
        $total_data = array(
            'totals' => &$totals,
            'taxes'  => &$taxes,
            'total'  => &$total
        );
        
        // Display prices
        if ($this->customer->isLogged() || !$this->config->get('config_customer_price')) {
            $sort_order = array();

            $results = $this->model_setting_extension->getExtensions('total');

            foreach ($results as $key => $value) {
                $sort_order[$key] = $this->config->get('total_' . $value['code'] . '_sort_order');
            }

            array_multisort($sort_order, SORT_ASC, $results);

            foreach ($results as $result) {
                if ($this->config->get('total_' . $result['code'] . '_status')) {
                    $this->load->model('extension/total/' . $result['code']);
                    
                    // We have to put the totals in an array so that they pass by reference.
                    $this->{'model_extension_total_' . $result['code']}->getTotal($total_data);
                }
            }

            $sort_order = array();

            foreach ($totals as $key => $value) {
                $sort_order[$key] = $value['sort_order'];
            }

            array_multisort($sort_order, SORT_ASC, $totals);
        }

        $data['totals'] = array();

        foreach ($totals as $total) {
            $data['totals'][] = array(
                'title' => $total['title'],
                'text'  => $total['value']
            );
        }

        return $data;
    }
    
    public function index() {
        if ($this->config->get('module_custom_events_status')) {
            $actual_route = isset($this->request->get['route']) ? $this->request->get['route'] : '';
            
            $data = array(
                'token' => $this->config->get('module_custom_events_token'),
                'is_logged' => $this->customer->isLogged() ? "true" : "false",
            );
            
            // informações do carrinho de compras
            $data['cart'] = array(
                'total' => $this->cart->getTotal(),
                'count' => $this->cart->countProducts(),
                'products' => $this->cart->getProducts()
            );
            
            // Adiciona informações do usuário se estiver logado
            if ($this->customer->isLogged()) {
                $data['customer'] = array(
                    'user_id' => $this->customer->getId(),
                    'email' => $this->customer->getEmail(),
                    'firstname' => $this->customer->getFirstName(),
                    'lastname' => $this->customer->getLastName(),
                    'telephone' => $this->customer->getTelephone()
                );
            }
            
            // Alterações do carrinho de compras
            $data['products'] = [];

            foreach ($this->cart->getProducts() as $product) {
                $data['products'][] = [
                    'cart_id'     => $product['cart_id'], // ID interno do carrinho
                    'product_id'  => $product['product_id'],
                    'name'        => $product['name'],
                    'model'       => $product['model'],
                    'quantity'    => $product['quantity'],
                    'price'       => $this->currency->format($product['price'], $this->session->data['currency']),
                    'total'       => $this->currency->format($product['total'], $this->session->data['currency']),
                    'options'     => $product['option'], // opções escolhidas (ex: tamanho, cor)
                    'recurring'   => isset($product['recurring']) ? $product['recurring'] : null,
                    'image'       => isset($product['image']) ? $product['image'] : null,
                ];
            }

            // Totais
            $data['totals'] = $this->load_cart_total();

            if (isset($this->request->get['product_id'])) {
                $data['product_id'] = $this->request->get['product_id'];
            }
            
            if (isset($this->request->get['master_id'])) {
                $data['master_id'] = $this->request->get['master_id'];
            }
            // Status do carrinho
            $data['has_products']  = $this->cart->hasProducts();
            $data['has_shipping']  = $this->cart->hasShipping();
            $data['has_download']  = $this->cart->hasDownload();
            $data['has_stock']         = $this->cart->hasStock();
            $data['count_products']    = $this->cart->countProducts();
            $data['base_url'] = $this->config->get('config_url');
            $data['oc_route'] = $actual_route;
            return $this->load->view('extension/module/custom_events', $data);
        }
    }
    
    public function getCustomerApi() {
        $json = array();
        
        // Check if user is logged in
        if (!$this->customer->isLogged()) {
            $json['error'] = 'User not authenticated';
            $this->response->addHeader('HTTP/1.0 401 Unauthorized');
            $this->response->setOutput(json_encode($json));
            return;
        }

        // Get customer data
        $json['customer'] = array(
            'customer_id' => $this->customer->getId(),
            'firstname' => $this->customer->getFirstName(),
            'lastname' => $this->customer->getLastName(),
            'email' => $this->customer->getEmail(),
            'telephone' => $this->customer->getTelephone(),
            'newsletter' => $this->customer->getNewsletter(),
            'customer_group_id' => $this->customer->getGroupId()
        );

        // Get customer address
        $this->load->model('account/address');
        $address = $this->model_account_address->getAddress($this->customer->getAddressId());
        
        if ($address) {
            $json['address'] = array(
                'address_id' => $address['address_id'],
                'company' => $address['company'],
                'address_1' => $address['address_1'],
                'address_2' => $address['address_2'],
                'postcode' => $address['postcode'],
                'city' => $address['city'],
                'zone_id' => $address['zone_id'],
                'zone' => $address['zone'],
                'country_id' => $address['country_id'],
                'country' => $address['country']
            );
        }

        // // Get customer orders
        // $this->load->model('account/order');
        // $orders = $this->model_account_order->getOrders();
        
        // $json['orders'] = array();
        // foreach ($orders as $order) {
        //     $json['orders'][] = array(
        //         'order_id' => $order['order_id'],
        //         'name' => $order['firstname'] . ' ' . $order['lastname'],
        //         // 'status' => $order['order_status'],
        //         'date_added' => $order['date_added'],
        //         // 'products' => $order['products'],
        //         'total' => $order['total']
        //     );
        // }

        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }
    
    public function getCartProductsApi() {
        $json = array();
        
        // Get cart products
        $products = $this->cart->getProducts();
        
        if (!$products) {
            $json['products'] = array();
            $json['total_items'] = 0;
            $json['total_amount'] = 0;
            
            $this->response->addHeader('Content-Type: application/json');
            $this->response->setOutput(json_encode($json));
            return;
        }

        $json['products'] = array();
        foreach ($products as $product) {
            $json['products'][] = array(
                'cart_id' => $product['cart_id'],
                'product_id' => $product['product_id'],
                'name' => $product['name'],
                'model' => $product['model'],
                'quantity' => $product['quantity'],
                'price' => $this->currency->format($product['price'], $this->session->data['currency']),
                'price_raw' => $product['price'],
                'total' => $this->currency->format($product['total'], $this->session->data['currency']),
                'total_raw' => $product['total'],
                'options' => $product['option'],
                'image' => isset($product['image']) ? $product['image'] : null,
                'stock' => $product['stock']
            );
        }
        
        // Get coupon information if exists
        if (!empty($this->session->data['coupon'])) {
            $this->load->model('extension/total/coupon');
            $coupon_info = $this->model_extension_total_coupon->getCoupon($this->session->data['coupon']);
            
            if ($coupon_info) {
                $json['coupon'] = array(
                    'code' => $coupon_info['code'],
                    'name' => $coupon_info['name'],
                    'type' => $coupon_info['type'],
                    'discount' => round(($this->cart->getTotal() * ($coupon_info['discount'] / 100)), 2),
                    'shipping' => round($coupon_info['shipping'], 2)
                );
            }
        }
        
        // Add cart totals
        $json['total_items'] = $this->cart->countProducts();
        $json['total_amount'] = $this->currency->format($this->cart->getTotal(), $this->session->data['currency']);
        $json['total_amount_raw'] = isset($json['coupon'])
            ? $this->cart->getTotal() - round(($this->cart->getTotal() * ($coupon_info['discount'] / 100)), 2)
            : $this->cart->getTotal();
        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }

    public function getLastOrderApi() {
        $json = array();
        
        // Check if user is logged in
        if (!$this->customer->isLogged()) {
            $json['error'] = 'User not authenticated';
            $this->response->addHeader('HTTP/1.0 401 Unauthorized');
            $this->response->setOutput(json_encode($json));
            return;
        }

        // Load order model
        $this->load->model('account/order');
        
        // Get customer's last order
        $orders = $this->model_account_order->getOrders(0, 1);
        
        if (!empty($orders)) {
            $last_order = $orders[0];
            
            // Get order products
            $order_products = $this->model_account_order->getOrderProducts($last_order['order_id']);
            
            $products = array();
            foreach ($order_products as $product) {
                $products[] = array(
                    'product_id' => $product['product_id'],
                    'name' => $product['name'],
                    'model' => $product['model'],
                    'quantity' => $product['quantity'],
                    'price' => $product['price'],
                    'total' => $product['total']
                );
            }
            
            $json['order'] = array(
                'order_id' => $last_order['order_id'],
                'status' => $last_order['status'],
                'date_added' => $last_order['date_added'],
                'total' => $last_order['total'],
                'products' => $products,
            );
        } else {
            $json['order'] = null;
        }

        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }
    /**
     * @return rest
     * @description Get category by product id
     */
    public function getCategoryByProductApi() {
        $json = array();
        
        // Get product_id from request
        $product_id = isset($this->request->get['product_id']) ? (int)$this->request->get['product_id'] : 0;
        
        if (!$product_id) {
            $json['error'] = 'Product ID is required';
            $this->response->addHeader('HTTP/1.0 400 Bad Request');
            $this->response->setOutput(json_encode($json));
            return;
        }

        // Load database query
        $sql = "SELECT 
                    c.name as category
                FROM 
                    " . DB_PREFIX . "product p
                    LEFT JOIN " . DB_PREFIX . "product_to_category ptc ON p.product_id = ptc.product_id
                    LEFT JOIN " . DB_PREFIX . "category_description c ON ptc.category_id = c.category_id
                WHERE
                    p.product_id = '" . (int)$product_id . "'
                GROUP BY 
                    p.product_id";

        $query = $this->db->query($sql);

        if ($query->num_rows) {
            $json['category'] = $query->row['category'];
        } else {
            $json['category'] = null;
        }

        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }
    
    /**
    * @return rest
    * @description variations
    */
    public function productVariationsApi() {
		$data = [];
        $json = array();
        
        // Validação do product_id
        if (!isset($this->request->get['product_id'])) {
            $json['error'] = 'Product ID não fornecido';
            $this->response->addHeader('HTTP/1.0 400 Bad Request');
            $this->response->setOutput(json_encode($json));
            return;
        }
        $product_id = (int)$this->request->get['product_id'];
        
        $this->load->model('catalog/product');
        $product_info = $this->model_catalog_product->getProduct($product_id);

        if (!$product_info) {
            $json['error'] = 'Produto não encontrado';
            $this->response->addHeader('HTTP/1.0 404 Not Found');
            $this->response->setOutput(json_encode($json));
            return;
        }

		if ($product_id) {

			$this->load->model('tool/image');

			$this->load->model('catalog/product');

			$this->load->model('extension/module/custom_events');

			$results = $this->model_extension_module_custom_events->getProductCombinations($product_id);
            $product = $this->model_catalog_product->getProduct($product_id); 
            
            // Quando nao ha combinacoes do produto ele retorna o proprio produto como variante de si mesmo (obrigatorio mailbiz/flowbiz)
            // quantos anos voce tinha quando descobriu que o jessie pinkman aparecia no clipe de thoughless do Korn?
            if (empty($results)) {
                $json['message'] = 'Nenhuma variação encontrada para este produto';
                $json['product_id'] = $product_id;
                $json['variants'][0] = array(
                    "sku" => $product['sku'] ? $product['sku'] : $product['product_id'],
                    "price" => (float)number_format($product['price'], 2, '.', '.'),
                    "name" => $product['name']
                );
                
                $this->response->addHeader('HTTP/1.0 200 OK');
                $this->response->addHeader('Content-Type: application/json');
                $this->response->setOutput(json_encode($json));
                return;
            }
            
            if (empty($results)) {
                $json['message'] = 'Nenhuma variação encontrada para este produto';
                $json['product_id'] = $product_id;
                $json['product_combinations'] = array();
                
                $this->response->addHeader('HTTP/1.0 200 OK');
                $this->response->setOutput(json_encode($json));
                return;
            }

			foreach ($results as $result) {
				$attribute_data = [];

				foreach ($result['attribute'] as $value) {
					$attribute_data[] = [
						'option' => $value['option'],
						'value' => $value['value'],
						'color' => $value['color'],
					];
				}

				$product_info = $this->model_extension_module_custom_events->getProductVariation($result['product_id']);

				if (is_file(DIR_IMAGE . $product_info['image'])) {
					$thumb = $product_info['image'];
				} else {
					$thumb = 'no_image.png';
				}
				$data['variants'][] = [
                    'sku' => $product_info['sku'],
					'price' => number_format($product_info['price'], 2, '.', ''),
					'name' => $product['name'],
				];

			}
            $data['product_id'] = $product_id;
            $this->response->addHeader('Content-Type: application/json');
            $this->response->setOutput(json_encode($data));
		}
		

		// definir a resposta como JSON
        $this->response->addHeader('HTTP/1.0 200 OK');
        $this->response->setOutput(json_encode($data));
		// $this->response->setOutput($this->load->view('extension/module/product_combination_list', $data));
    }
}