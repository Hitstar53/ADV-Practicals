from flask import Flask, request, jsonify
import os
from typing import Dict, Any, List
import pandas as pd
import numpy as np
import re
from datetime import datetime
import json
import google.generativeai as genai
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Use environment variable for API key instead of hardcoding
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable not set")
    
genai.configure(api_key=GOOGLE_API_KEY)
app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

dataset = None

def process_natural_language_query(query: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
    # Prepare context about available columns and their types
    columns_context = "Available columns and their properties:\n"
    for column, details in analysis.items():
        columns_context += f"\n- {column}:"
        columns_context += f"\n  Type: {details['type']}"
        if 'statistics' in details:
            if details['type'] == 'continuous':
                columns_context += f"\n  Range: {details['statistics']['min']} to {details['statistics']['max']}"
            elif details['type'] in ['binary', 'ordinal']:
                columns_context += f"\n  Possible values: {list(details['statistics'].get('distribution', {}).keys())}"
        columns_context += f"\n  Missing values: {details['missing_values']['percentage']}%"

    prompt = f"""
    You are a data visualization expert. Given a dataset with the following structure:

    {columns_context}

    User Query: "{query}"

    IMPORTANT CONSTRAINTS:
    1. ONLY suggest visualizations using the exact columns listed above. DO NOT suggest creating new calculated fields, 
       derived variables, or transformations of the data.
    2. Each suggestion must use only the actual column names provided, exactly as they appear in the list.
    3. If the query cannot be answered using only the existing columns, explain this limitation and suggest the closest 
       possible visualization using available columns.
    4. Do not suggest aggregations or calculations that would require creating new variables.

    Please analyze this query and provide:
    1. An interpretation of what the user wants to visualize
    2. The most appropriate visualization(s) using only existing columns
    3. Any additional insights (while respecting the constraints above)

    For chart_type, use ONLY one of the following standardized types:
    - line
    - bar
    - scatter
    - pie
    - donut
    - area
    - heatmap
    - box
    - violin
    - bubble
    - radar

    Respond in the following JSON format:
    {{
        "query": "the original user query",
        "interpretation": "explanation of what the user is trying to understand",
        "matches_available_data": boolean indicating if the query can be answered with available columns,
        "primary_visualization": {{
            "chart_type": "one of the standardized chart types listed above",
            "variables": ["list", "of", "exact", "column", "names"],
            "description": "why this visualization is appropriate",
            "implementation_notes": "any special considerations for implementation"
        }},
        "alternative_visualizations": [
            {{
                "chart_type": "one of the standardized chart types listed above",
                "variables": ["list", "of", "exact", "column", "names"],
                "description": "why this might also be useful"
            }}
        ],
        "limitations": "description of any limitations due to available columns",
        "additional_insights": "any other relevant suggestions (using only existing columns)"
    }}

    Remember: Only use exact column names from the list above and only use the standardized chart types listed.
    """

    try:
        # Get response from Gemini
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(prompt)
        
        # Extract and parse the JSON response
        response_text = response.text.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        result["query"] = query  
        return result
    except Exception as e:
        return {
            "query": query,
            "interpretation": "Error processing query",
            "matches_available_data": False,
            "primary_visualization": {
                "chart_type": "Error",
                "variables": [],
                "description": f"Failed to process visualization query: {str(e)}",
                "implementation_notes": "Error occurred during processing"
            },
            "alternative_visualizations": [],
            "limitations": "Error occurred during processing",
            "additional_insights": "Please try rephrasing your query"
        }

def get_visualization_suggestions(analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    # Prepare the prompt for Gemini
    prompt = """
    Based on the following dataset analysis, suggest 5-10 meaningful visualizations that would best represent the data.
    For each visualization, provide:
    1. The type of chart/plot (use ONLY the standardized types listed below)
    2. The specific variables to be used
    3. A brief justification of why this visualization would be insightful

    Use ONLY these standardized chart types:
    - line
    - bar
    - scatter
    - pie
    - donut
    - area
    - heatmap
    - box
    - violin
    - bubble
    - radar


    Dataset Analysis:
    """
    
    # Add formatted analysis information
    for column, details in analysis.items():
        prompt += f"\n\nColumn: {column}"
        prompt += f"\nType: {details['type']}"
        
        if 'statistics' in details:
            if details['type'] == 'continuous':
                prompt += f"\nRange: {details['statistics']['min']} to {details['statistics']['max']}"
            elif details['type'] in ['binary', 'ordinal']:
                prompt += "\nDistribution: " + str(details['statistics'].get('distribution', ''))
        
        prompt += f"\nMissing values: {details['missing_values']['percentage']}%"
    
    prompt += """\n\nPlease provide visualization suggestions in the following JSON format:
    {
        "visualizations": [
            {
                "chart_type": "one of the standardized chart types listed above",
                "variables": ["variable1", "variable2"],
                "description": "brief justification"
            }
        ]
    }
    Strictly use the variables provided and only use the standardized chart types listed.
    Only return the JSON, no additional text."""

    try:
        # Get response from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        # Extract the JSON string from the response
        response_text = response.text.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        # Parse the JSON
        suggestions = json.loads(response_text.strip())
        return suggestions['visualizations']
    except Exception as e:
        return [{
            "chart_type": "Error",
            "variables": [],
            "description": f"Failed to get visualization suggestions: {str(e)}"
        }]

@app.route('/upload-dataset', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    global dataset
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "Please upload a CSV file"}), 400
        
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)
        dataset = pd.read_csv(filepath)
        return jsonify({
            "message": "File uploaded successfully",
            "shape": dataset.shape
        })
    except Exception as e:
        return jsonify({"error": f"Error reading CSV: {str(e)}"}), 500

@app.route('/get-visualizations', methods=['GET'])
def get_visualizations():
    global dataset
    if dataset is None:
        try:
            csv_files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('.csv')]
            if csv_files:
                filepath = os.path.join(UPLOAD_FOLDER, csv_files[0])
                dataset = pd.read_csv(filepath)
            else:
                return jsonify({"error": "No dataset uploaded yet"}), 400
        except Exception as e:
            return jsonify({"error": f"Error loading dataset: {str(e)}"}), 500
    
    analysis = analyze_dataset()
    visualization_suggestions = get_visualization_suggestions(analysis)
    analysis['visualization_suggestions'] = visualization_suggestions
    
    return jsonify(analysis)

@app.route('/query-visualizations', methods=['POST'])
def query_visualizations():
    """
    Endpoint for processing natural language queries about the dataset.
    
    Expected POST body:
    {
        "query": "natural language query string"
    }
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
        
    data = request.get_json()
    if 'query' not in data:
        return jsonify({"error": "Query is required"}), 400
        
    global dataset
    if dataset is None:
        try:
            csv_files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('.csv')]
            if csv_files:
                filepath = os.path.join(UPLOAD_FOLDER, csv_files[0])
                dataset = pd.read_csv(filepath)
            else:
                return jsonify({"error": "No dataset uploaded yet"}), 400
        except Exception as e:
            return jsonify({"error": f"Error loading dataset: {str(e)}"}), 500
            
    analysis = analyze_dataset()
    result = process_natural_language_query(data['query'], analysis)
    return jsonify(result)

def serialize_numpy(obj):
    """Convert numpy types to native Python types."""
    if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
        np.int16, np.int32, np.int64, np.uint8,
        np.uint16, np.uint32, np.uint64)):
        return int(obj)
    elif isinstance(obj, (np.float16, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, (np.bool_)):
        return bool(obj)
    elif isinstance(obj, (np.void)): 
        return None
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    return obj

@app.route('/analyze-dataset', methods=['GET'])
def analyze_dataset():
    global dataset
    if dataset is None:
        try:
            csv_files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('.csv')]
            if csv_files:
                filepath = os.path.join(UPLOAD_FOLDER, csv_files[0])
                dataset = pd.read_csv(filepath)
            else:
                return jsonify({"error": "No dataset uploaded yet"}), 400
        except Exception as e:
            return jsonify({"error": f"Error loading dataset: {str(e)}"}), 500
    
    analysis = {}
    
    # Common ordinal terms and their relative ordering
    ordinal_patterns = {
        'rating': ['poor', 'fair', 'good', 'very good', 'excellent'],
        'agreement': ['strongly disagree', 'disagree', 'neutral', 'agree', 'strongly agree'],
        'frequency': ['never', 'rarely', 'sometimes', 'often', 'always'],
        'size': ['xs', 's', 'm', 'l', 'xl', 'xxl'],
        'priority': ['low', 'medium', 'high', 'critical'],
        'education': ['primary', 'secondary', 'bachelor', 'master', 'doctorate', 'phd'],
        'satisfaction': ['very unsatisfied', 'unsatisfied', 'neutral', 'satisfied', 'very satisfied']
    }

    # Common nominal column patterns
    nominal_patterns = {
        'name': ['name', 'first_name', 'last_name', 'full_name'],
        'location': ['city', 'state', 'country', 'region', 'province', 'address'],
        'identifier': ['id', 'code', 'reference', 'ref'],
        'category': ['category', 'type', 'group', 'department', 'team'],
        'contact': ['email', 'phone', 'contact'],
        'status': ['status', 'state', 'condition']
    }
    
    def is_date_column(series: pd.Series) -> bool:
        """Check if a column contains date/datetime values."""
        if series.dtype.name in ['datetime64[ns]', 'datetime64']:
            return True
            
        if series.dtype == 'object':
            try:
                pd.to_datetime(series.dropna().head())
                return True
            except (ValueError, TypeError):
                return False
        return False

    def contains_words(text: str) -> bool:
        """Check if a string contains word characters (letters)."""
        return bool(re.search(r'[a-zA-Z]', str(text)))

    def is_likely_text_data(series: pd.Series) -> bool:
        """Check if a series likely contains meaningful text data."""
        sample = series.dropna().head(10)
        return all(contains_words(val) for val in sample) and series.str.len().mean() > 3

    def matches_nominal_pattern(column_name: str) -> bool:
        """Check if column name matches common nominal patterns."""
        column_lower = column_name.lower()
        return any(
            any(pattern in column_lower for pattern in patterns)
            for patterns in nominal_patterns.values()
        )
    
    def is_ordinal_column(series: pd.Series, column_name: str) -> bool:
        """Detect if a column contains ordinal data."""
        if is_likely_text_data(series) or matches_nominal_pattern(column_name):
            return False

        unique_vals = series.dropna().unique()
        
        if len(unique_vals) > 15:
            return False

        unique_vals_lower = [str(val).lower().strip() for val in unique_vals]
        
        for pattern in ordinal_patterns.values():
            pattern_lower = [p.lower() for p in pattern]
            matches = sum(1 for val in unique_vals_lower if val in pattern_lower)
            if matches >= min(len(unique_vals), len(pattern_lower) - 1):
                return True
        
        if series.dtype in ['int64', 'float64']:
            if 2 < len(unique_vals) <= 10:
                value_counts = series.value_counts()
                max_count = value_counts.max()
                min_count = value_counts.min()
                if min_count > max_count * 0.1:
                    return True
                
        common_prefixes = ['level', 'grade', 'stage', 'tier', 'phase', 'rank', 'year']
        if series.dtype == 'object':
            column_lower = column_name.lower()
            if any(prefix in column_lower for prefix in common_prefixes):
                return True
                
        return False
    
    def is_binary_column(series: pd.Series) -> bool:
        """Detect if a column contains binary data."""
        unique_vals = series.dropna().unique()
        if len(unique_vals) != 2:
            return False
            
        binary_pairs = [
            {'yes', 'no'}, {'true', 'false'}, {'0', '1'}, {0, 1},
            {'male', 'female'}, {'m', 'f'}, {'pass', 'fail'},
            {'positive', 'negative'}, {'success', 'failure'},
            {'active', 'inactive'}, {'on', 'off'}, {'enabled', 'disabled'}
        ]
        
        values_set = {str(v).lower().strip() for v in unique_vals}
        return any(values_set == pair for pair in binary_pairs)
    
    def is_continuous_column(series: pd.Series) -> bool:
        """Detect if a column contains continuous numerical data."""
        if not pd.api.types.is_numeric_dtype(series):
            return False
            
        unique_vals = series.dropna().unique()
        total_vals = len(series.dropna())
        
        if len(unique_vals) <= 10:
            return False

        if len(unique_vals) > max(total_vals * 0.2, 100):
            return True
            
        if series.dtype == 'float64':
            has_decimals = any(not float(x).is_integer() for x in unique_vals[:100])
            if has_decimals:
                return True
                
        value_range = series.max() - series.min()
        if value_range > 100:
            percentiles = np.percentile(unique_vals, [25, 50, 75])
            if percentiles[1] - percentiles[0] > 0 and percentiles[2] - percentiles[1] > 0:
                return True
            
        return False
    
    for column in dataset.columns:
        col_data = dataset[column]
        missing_count = col_data.isna().sum()
        total_count = len(col_data)
        
        analysis[column] = {
            'missing_values': {
                'count': serialize_numpy(missing_count),
                'percentage': serialize_numpy(missing_count / total_count * 100)
            },
            'unique_values': {
                'count': serialize_numpy(col_data.nunique()),
                'examples': [serialize_numpy(val) for val in col_data.dropna().unique()[:5]]
            }
        }
        
        if is_date_column(col_data):
            dtype = 'datetime'
            if col_data.dtype == 'object':
                col_data = pd.to_datetime(col_data)
            analysis[column]['statistics'] = {
                'min': col_data.min().isoformat(),
                'max': col_data.max().isoformat(),
                'range_days': serialize_numpy((col_data.max() - col_data.min()).days)
            }
        
        elif is_binary_column(col_data):
            dtype = 'binary'
            value_counts = col_data.value_counts()
            analysis[column]['statistics'] = {
                'distribution': {
                    str(k): serialize_numpy(v) for k, v in value_counts.items()
                }
            }
            
        elif is_continuous_column(col_data):
            dtype = 'continuous'
            analysis[column]['statistics'] = {
                'mean': serialize_numpy(col_data.mean()),
                'median': serialize_numpy(col_data.median()),
                'std': serialize_numpy(col_data.std()),
                'min': serialize_numpy(col_data.min()),
                'max': serialize_numpy(col_data.max()),
                'quartiles': {
                    'q1': serialize_numpy(col_data.quantile(0.25)),
                    'q3': serialize_numpy(col_data.quantile(0.75))
                },
                'skewness': serialize_numpy(col_data.skew()),
                'kurtosis': serialize_numpy(col_data.kurtosis())
            }
            
        elif is_ordinal_column(col_data, column):
            dtype = 'ordinal'
            value_counts = col_data.value_counts()
            analysis[column]['statistics'] = {
                'distribution': {
                    str(k): serialize_numpy(v) for k, v in value_counts.items()
                }
            }
            
        else:
            dtype = 'nominal'
            value_counts = col_data.value_counts()
        
        analysis[column]['type'] = dtype
    
    return analysis

@app.route('/get-chart-data', methods=['GET'])
def get_chart_data():
    global dataset
    if dataset is None:
        return jsonify({"error": "No dataset loaded"}), 400
    
    try:
        # Always sample 1000 rows (or less if dataset is smaller)
        sample_size = min(1000, len(dataset))
        sampled_data = dataset.sample(n=sample_size, random_state=42)
        
        # Convert to dict and handle NaN values
        records = sampled_data.replace({np.nan: None}).to_dict(orient='records')
        
        response = {
            "columns": list(dataset.columns),
            "data": records,
            "total_records": len(dataset),
            "sample_size": sample_size
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": f"Error processing data: {str(e)}"}), 500

@app.route('/get-visualization-suggestions', methods=['GET'])
def get_visualization_suggestions_route():
    global dataset
    if dataset is None:
        return jsonify({"error": "No dataset loaded"}), 400
        
    analysis = analyze_dataset()
    suggestions = get_visualization_suggestions(analysis)
    return jsonify(suggestions)

if __name__ == '__main__':
    app.run(debug=True)