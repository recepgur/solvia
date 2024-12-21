from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from network_pattern_collector import NetworkPatternCollector
from server_penetration_collector import ServerPenetrationCollector
from agent_deployment_collector import AgentDeploymentCollector
from exploit_generation_model import ExploitGenerator
from target_validator import TargetValidator

app = Flask(__name__)
CORS(app)

# Set up logging
import logging
log_dir = os.path.dirname(os.path.abspath(__file__))
log_path = os.path.join(log_dir, 'web_panel.log')
logging.basicConfig(filename=log_path, level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize exploit generator with templates and advanced features
generator = ExploitGenerator(
    model_name="EleutherAI/gpt-neo-125M",
    enable_gpt=True,
    enable_polymorphic=True,
    enable_autonomous_learning=True
)
template_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                            "exploit_templates.csv")
generator.load_templates(template_path)

# Enable advanced stealth features
generator.enable_stealth_features({
    'anti_forensics': True,
    'sandbox_detection': True,
    'kernel_stealth': True,
    'memory_protection': True
})

# Initialize collectors and model
network_collector = NetworkPatternCollector()
server_collector = ServerPenetrationCollector()
agent_collector = AgentDeploymentCollector()
validator = TargetValidator()

# Load patterns
network_collector.load_network_patterns()
server_collector.load_server_patterns()
agent_collector.load_agent_patterns()

@app.route('/api/analyze', methods=['POST'])
def analyze_target():
    """Analyze target URL or server address"""
    data = request.get_json()
    target = data.get('target')
    
    if not target:
        return jsonify({'error': 'No target specified'}), 400
        
    # Validate target
    validation_result = validator.validate_target(target)
    if not validation_result["allowed"]:
        logger.warning(f"Target validation failed: {target}")
        return jsonify({'error': 'Target not in whitelist'}), 400
    
    # Collect patterns
    network_patterns = network_collector.get_patterns_dataset()
    server_patterns = server_collector.get_patterns_dataset()
    agent_patterns = agent_collector.get_patterns_dataset()
    
    # Analyze target
    analysis_results = {
        'target': target,
        'network_analysis': network_patterns.to_dict('records'),
        'server_analysis': server_patterns.to_dict('records'),
        'agent_capabilities': agent_patterns.to_dict('records'),
        'risk_assessment': {
            'network_risk': 'medium',
            'server_risk': 'high',
            'overall_risk': 'high'
        },
        'potential_vulnerabilities': [
            {
                'type': 'network',
                'description': 'Potential network vulnerability',
                'severity': 'high',
                'mitigation': 'Update firewall rules'
            },
            {
                'type': 'server',
                'description': 'Potential server vulnerability',
                'severity': 'medium',
                'mitigation': 'Apply security patches'
            }
        ],
        'autonomous_learning': {
            'patterns_detected': 5,
            'learning_progress': 0.75,
            'adaptation_rate': 0.85
        }
    }
    
    return jsonify(analysis_results)



@app.route('/api/generate_exploit', methods=['POST'])
def generate_exploit():
    """Generate exploit code for detected vulnerabilities"""
    data = request.get_json()
    vulnerability_info = data.get('vulnerability_info')
    
    if not vulnerability_info or 'target' not in vulnerability_info:
        return jsonify({'error': 'No target or vulnerability information provided'}), 400
        
    # Validate target
    target = vulnerability_info['target']
    validation_result = validator.validate_target(target)
    if not validation_result["allowed"]:
        logger.warning(f"Target validation failed for exploit generation: {target}")
        return jsonify({'error': 'Target not in whitelist'}), 400
    
    # Extract advanced options
    advanced_options = {}
    if 'stealthOptions' in vulnerability_info:
        advanced_options['stealth_config'] = vulnerability_info['stealthOptions']
    if 'useGPT' in vulnerability_info:
        advanced_options['use_gpt'] = vulnerability_info['useGPT']
    if 'enablePolymorphic' in vulnerability_info:
        advanced_options['enable_polymorphic'] = vulnerability_info['enablePolymorphic']
    if 'autonomousLearning' in vulnerability_info:
        advanced_options['autonomous_learning'] = vulnerability_info['autonomousLearning']
        
    try:
        logger.debug(f"Attempting to generate exploit with info: {vulnerability_info}")
        logger.debug(f"Advanced options: {advanced_options}")
        
        # Generate exploit code with advanced options
        exploit_code = generator.generate_exploit(vulnerability_info, advanced_options)
        logger.debug(f"Generated exploit code: {exploit_code}")
        
        if exploit_code:
            # Get learning metrics
            metrics = generator.get_metrics()
            logger.debug(f"Generation metrics: {metrics}")
            
            return jsonify({
                'exploit_code': exploit_code,
                'metrics': metrics,
                'status': 'success'
            })
        else:
            return jsonify({
                'error': 'Failed to generate safe exploit code',
                'status': 'failed'
            }), 400
            
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get system status including exploit generator metrics"""
    metrics = generator.get_metrics()
    status = {
        'network_collector': 'active',
        'server_collector': 'active',
        'agent_collector': 'active',
        'analysis_engine': 'ready',
        'patterns_loaded': True,
        'exploit_generator': {
            'status': 'active',
            'metrics': metrics,
            'gpt_enabled': True,
            'polymorphic_enabled': True,
            'autonomous_learning': True
        },
        'stealth_features': {
            'anti_forensics': True,
            'sandbox_detection': True,
            'kernel_stealth': True,
            'memory_protection': True
        }
    }
    return jsonify(status)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
