<?php
class ModelExtensionModuleCustomEvents extends Model {

	public $error = [];
    // obtem combinações de um produto
    public function getProductCombinations(int $parent_id) {
        $query = $this->db->query("SELECT * FROM `" . DB_PREFIX . "product_combination` pc WHERE parent_id = '" . (int)$parent_id . "'");

		$combination_data = [];

		foreach ($query->rows as $result) {
			$query_product_combination_attribute = $this->db->query("
				SELECT * FROM ".DB_PREFIX."product_combination_attribute pca 
				WHERE pca.product_combination_id = '".(int)$result['product_combination_id']."'
			");

			$attribute_data = [];

			foreach ($query_product_combination_attribute->rows as $product_combination_attribute) {
				$query_option_value = $this->db->query("
					SELECT ovd.name, od.name as option_name, ov.color FROM ".DB_PREFIX."option_value_description ovd 
					LEFT JOIN ".DB_PREFIX."option_value ov ON (ov.option_value_id = ovd.option_value_id)
					LEFT JOIN ".DB_PREFIX."option_description od ON (od.option_id = ov.option_id)
					WHERE ovd.option_value_id = '".(int)$product_combination_attribute['attribute_id']."'
					ORDER BY sort_order
				");

				$attribute_data[] = [
					'option' => $query_option_value->row['option_name'],
					'value' => $query_option_value->row['name'],
					'color' => $query_option_value->row['color'],
				];

				if (empty($query_option_value->row['option_name'])) {
					$query_option_value = $this->db->query("DELETE FROM ".DB_PREFIX."product_combination_attribute WHERE attribute_id='". (int)$product_combination_attribute['attribute_id'] ."'");
				}
			}

			$combination_data[] = [
				'product_id' => $result['product_id'],
				'parent_id' => $result['parent_id'],
				'is_default' => $result['is_default'],
				'product_combination_id' => $result['product_combination_id'],
				'image' => $result['image'],
				'status' => $result['status'],
				'attribute' => $attribute_data,
			];
		}
        return (array)$combination_data;
    }

    // obtem variação de um produto
	public function getProductVariation($product_id) {
		$query = $this->db->query("SELECT DISTINCT * FROM " . DB_PREFIX . "product p WHERE p.product_id = '" . (int)$product_id . "'");

		return $query->row;
	}
}