from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import os
from data.symptoms import symptom_translations  # Import symptom translations

app = Flask(__name__)

# Load datasets
bobot_path = os.path.join('data', 'bobot.csv')
dataset_path = os.path.join('data', 'dataset.csv')

file_bobot = pd.read_csv(bobot_path)
file_dataset = pd.read_csv(dataset_path)

# Prepare symptoms and weights
symptoms_bobot = {row['Symptom']: row['weight'] for _, row in file_bobot.iterrows()}

symptom_counts = {symptom: 0 for symptom in symptoms_bobot}
for _, row in file_dataset.iterrows():
    for symptom in row[1:].dropna():
        if symptom in symptom_counts:
            symptom_counts[symptom] += 1

max_count = max(symptom_counts.values())
for symptom in symptoms_bobot:
    if symptom_counts[symptom] != 0:
        symptoms_bobot[symptom] *= (max_count / symptom_counts[symptom])

# Reverse mapping for translations
translated_to_original = {v: k for k, v in symptom_translations.items()}
symptoms_list = list(symptom_translations.values())

# Helper functions
def prepare_case(symptoms_row):
    return [symptom for symptom in symptoms_row if symptom in symptoms_bobot]

def sorensen_coefficient_weighted(case1, case2):
    intersection = sum(symptoms_bobot.get(symptom, 0) for symptom in set(case1) & set(case2))
    total_weight = sum(symptoms_bobot.get(symptom, 0) for symptom in set(case1)) + \
                   sum(symptoms_bobot.get(symptom, 0) for symptom in set(case2))
    return 2 * intersection / total_weight if total_weight != 0 else 0

def classify_case_all_matches(case, training_data, training_labels, threshold=0.3):
    disease_similarities = {}
    for i, train_case in enumerate(training_data):
        similarity = sorensen_coefficient_weighted(case, train_case)
        disease_label = training_labels[i]
        if similarity >= threshold:
            disease_similarities.setdefault(disease_label, []).append(similarity)

    return {disease: np.mean(similarities) for disease, similarities in disease_similarities.items()}

# Prepare dataset for training
X_cases = []
y_labels = []
for _, row in file_dataset.iterrows():
    symptoms_row = row[1:].dropna().values
    case = prepare_case(symptoms_row)
    X_cases.append(case)
    y_labels.append(row['Disease'])

data = pd.DataFrame({'case': X_cases, 'label': y_labels})

# Routes
@app.route('/')
def index():
    return render_template('index.html', symptoms=symptoms_list)

@app.route('/result', methods=['POST'])
def result():
    selected_symptoms = request.json.get('symptoms', [])
    # Convert back to original symptom names
    original_symptoms = [translated_to_original[symptom] for symptom in selected_symptoms]
    user_case = prepare_case(original_symptoms)

    if not user_case:
        return jsonify({'error': 'Gejala tidak ditemukan dalam data. Pastikan Anda memilih gejala yang valid.'}), 400

    disease_similarities = classify_case_all_matches(user_case, X_cases, y_labels, threshold=0.3)

    if not disease_similarities:
        return jsonify({'message': 'Tidak ada penyakit dengan kemiripan yang cukup tinggi berdasarkan gejala Anda.'})

    sorted_results = sorted(disease_similarities.items(), key=lambda item: item[1], reverse=True)
    return jsonify({'results': sorted_results})

if __name__ == '__main__':
    app.run(debug=True)
