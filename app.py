from flask import Flask, render_template, jsonify, request, send_file
import logging
import json
import os
import io
import pandas as pd
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class DataManager:
    def __init__(self):
        self.data_file = 'user_data.json'
        self.load_data()

    def load_data(self):
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    raw_content = f.read()
                    logger.debug(f"Raw JSON content: {raw_content}")

                    if not raw_content.strip():
                        logger.warning("Empty data file, initializing with defaults")
                        self.initialize_default_data()
                        return

                    try:
                        data = json.loads(raw_content)
                        self.income = data.get('income', 0)
                        self.expenses = pd.DataFrame(data.get('expenses', []))
                        self.budget = pd.DataFrame(data.get('budget', []))
                        self.goals = pd.DataFrame(data.get('goals', []))
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error at position {e.pos}: {e.msg}")
                        logger.error(f"Problem portion: {raw_content[max(0, e.pos-20):min(len(raw_content), e.pos+20)]}")
                        self.initialize_default_data()
            else:
                logger.warning(f"Data file {self.data_file} not found, initializing with defaults")
                self.initialize_default_data()
        except Exception as e:
            logger.error(f"Unexpected error loading data: {str(e)}")
            self.initialize_default_data()

    def initialize_default_data(self):
        logger.info("Initializing default data structure")
        self.income = 0
        self.expenses = pd.DataFrame(columns=['date', 'category', 'amount', 'description'])
        self.budget = pd.DataFrame(columns=['category', 'budget'])
        self.goals = pd.DataFrame(columns=['name', 'target', 'current', 'deadline'])
        self.save_data()

    def save_data(self):
        try:
            data = {
                'income': self.income,
                'expenses': self.expenses.to_dict('records') if not self.expenses.empty else [],
                'budget': self.budget.to_dict('records') if not self.budget.empty else [],
                'goals': self.goals.to_dict('records') if not self.goals.empty else []
            }
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4)
            logger.debug("Data saved successfully")
        except Exception as e:
            logger.error(f"Error saving data: {str(e)}")

    def set_income(self, amount):
        self.income = amount
        self.save_data()

    def add_expense(self, date, category, amount, description):
        new_expense = pd.DataFrame({
            'date': [date],
            'category': [category],
            'amount': [amount],
            'description': [description]
        })
        if self.expenses.empty:
            self.expenses = new_expense
        else:
            self.expenses = pd.concat([self.expenses, new_expense], ignore_index=True)
        self.save_data()

    def update_budget(self, category, amount):
        if self.budget.empty or category not in self.budget['category'].values:
            new_budget = pd.DataFrame([{'category': category, 'budget': amount}])
            self.budget = pd.concat([self.budget, new_budget], ignore_index=True)
        else:
            self.budget.loc[self.budget['category'] == category, 'budget'] = amount
        self.save_data()

    def get_monthly_summary(self, year=None, month=None):
        if self.expenses.empty:
            return 0, {}

        if year is None or month is None:
            current_date = datetime.now()
            year = current_date.year
            month = current_date.month

        # Convert date strings to datetime
        self.expenses['date'] = pd.to_datetime(self.expenses['date'])

        # Filter expenses for the specified month
        monthly_expenses = self.expenses[
            (self.expenses['date'].dt.year == year) & 
            (self.expenses['date'].dt.month == month)
        ]

        total = monthly_expenses['amount'].sum() if not monthly_expenses.empty else 0
        by_category = monthly_expenses.groupby('category')['amount'].sum().to_dict() if not monthly_expenses.empty else {}
        return total, by_category

    def export_data(self):
        # Create a buffer to store the CSV data
        buffer = io.StringIO()

        # Export expenses with proper date formatting
        if not self.expenses.empty:
            expenses_df = self.expenses.copy()
            expenses_df['date'] = pd.to_datetime(expenses_df['date']).dt.strftime('%Y-%m-%d')
            expenses_df.to_csv(buffer, index=False)
        else:
            buffer.write('date,category,amount,description\n')

        # Get the contents of the buffer
        buffer.seek(0)
        return buffer.getvalue()

    def add_goal(self, name, target, current, deadline):
        new_goal = pd.DataFrame([{
            'name': name,
            'target': target,
            'current': current,
            'deadline': deadline
        }])
        self.goals = pd.concat([self.goals, new_goal], ignore_index=True)
        self.save_data()

    def update_goal(self, name, current):
        if not self.goals.empty and name in self.goals['name'].values:
            self.goals.loc[self.goals['name'] == name, 'current'] = current
            self.save_data()

    def delete_goal(self, name):
        if not self.goals.empty and name in self.goals['name'].values:
            self.goals = self.goals[self.goals['name'] != name]
            self.save_data()

data_manager = DataManager()

@app.template_filter('currency')
def currency_filter(value):
    return f"₹{value:,.2f}"

@app.route('/')
def index():
    monthly_total, expenses_by_category = data_manager.get_monthly_summary()
    budget_total = data_manager.budget['budget'].sum() if not data_manager.budget.empty else 0
    savings = data_manager.income - monthly_total
    savings_percent = (savings / data_manager.income * 100) if data_manager.income > 0 else 0

    return render_template('index.html',
                         income=data_manager.income,
                         monthly_total=monthly_total,
                         budget_total=budget_total,
                         savings=savings,
                         savings_percent=savings_percent)

@app.route('/budget')
def budget():
    monthly_total, expenses_by_category = data_manager.get_monthly_summary()
    budget_data = data_manager.budget.to_dict('records')
    return render_template('budget.html', 
                         budget_data=budget_data,
                         expenses=expenses_by_category)

@app.route('/goals')
def goals():
    goals_data = data_manager.goals.to_dict('records')
    return render_template('goals.html', goals=goals_data)

@app.route('/api/budget', methods=['POST'])
def update_budget():
    try:
        data = request.get_json()
        data_manager.update_budget(data['category'], float(data['amount']))
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/goals', methods=['POST'])
def manage_goals():
    try:
        data = request.get_json()
        action = data.get('action')

        if action == 'add':
            data_manager.add_goal(
                data['name'],
                float(data['target']),
                float(data.get('current', 0)),
                data['deadline']
            )
        elif action == 'update':
            data_manager.update_goal(data['name'], float(data['current']))
        elif action == 'delete':
            data_manager.delete_goal(data['name'])

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/expenses')
def get_expenses():
    monthly_total, by_category = data_manager.get_monthly_summary()
    recent = data_manager.expenses.sort_values('date', ascending=False).head(5).to_dict('records') if not data_manager.expenses.empty else []

    return jsonify({
        'by_category': by_category,
        'recent': recent
    })

@app.route('/api/update-income', methods=['POST'])
def update_income():
    try:
        data = request.get_json()
        new_income = float(data['income'])
        data_manager.set_income(new_income)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/export-data')
def export_data():
    try:
        csv_data = data_manager.export_data()
        return send_file(
            io.StringIO(csv_data),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'fintrack_data_{datetime.now().strftime("%Y-%m")}.csv'
        )
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/add-expense', methods=['POST'])
def add_expense():
    try:
        data = request.get_json()
        data_manager.add_expense(
            data['date'],
            data['category'],
            float(data['amount']),
            data['description']
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)