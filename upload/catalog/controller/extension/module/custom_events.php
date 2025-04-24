<?php
class ControllerExtensionModuleCustomEvents extends Controller {
    public function index() {
        if ($this->config->get('module_custom_events_status')) {
            $this->document->addScript('catalog/view/javascript/custom_events.js');
            
            $data = array(
                'token' => $this->config->get('module_custom_events_token')
            );
            
            return $this->load->view('extension/module/custom_events', $data);
        }
    }
}