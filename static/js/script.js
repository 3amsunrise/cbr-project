let allSymptoms = [];

document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.querySelector('.symptom-dropdown');
    const options = Array.from(dropdown.options)
        .filter(option => option.value) 
        .sort((a, b) => a.text.localeCompare(b.text)); 

    
    dropdown.innerHTML = `
        <option value="" disabled selected>Pilih gejala...</option>
        ${options.map(option => `<option value="${option.value}">${option.text}</option>`).join('')}
    `;
    
    allSymptoms = options.map(option => option.value);
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Cari gejala...';
    searchInput.className = 'form-control mb-3';
    searchInput.id = 'search-symptom';
    document.getElementById('symptom-container').prepend(searchInput);

    searchInput.addEventListener('input', handleSearch);

    document.getElementById('result').style.display = 'none';
});

function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    const suggestionBox = document.getElementById('suggestion-box') || createSuggestionBox();

    if (query === '') {
        suggestionBox.style.display = 'none';
        return;
    }

    const suggestions = allSymptoms
        .filter(symptom => symptom.toLowerCase().includes(query))
        .sort((a, b) => a.localeCompare(b));

    suggestionBox.innerHTML = ''; 

    if (suggestions.length > 0) {
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            item.addEventListener('click', () => addSymptomFromSearch(suggestion));
            suggestionBox.appendChild(item);
        });
        suggestionBox.style.display = 'block';
    } else {
        suggestionBox.style.display = 'none';
    }
}

function createSuggestionBox() {
    const box = document.createElement('div');
    box.id = 'suggestion-box';
    box.className = 'suggestion-box';
    const searchInput = document.getElementById('search-symptom');
    searchInput.parentNode.insertBefore(box, searchInput.nextSibling);
    return box;
}

function addSymptomFromSearch(symptom) {
    addSymptomBox(symptom);

    const searchInput = document.getElementById('search-symptom');
    searchInput.value = '';
    const suggestionBox = document.getElementById('suggestion-box');
    if (suggestionBox) suggestionBox.style.display = 'none';

    document.getElementById('result').style.display = 'none';
}

function addSymptomBox(preSelectedSymptom = "") {
    const container = document.getElementById('symptom-container');
    const newGroup = document.createElement('div');
    newGroup.className = 'input-group mb-2';

    const dropdownHTML = `
        <select name="symptoms" class="form-select symptom-dropdown">
            <option value="" disabled selected>Pilih gejala...</option>
            ${allSymptoms
                .map(symptom => `<option value="${symptom}" ${symptom === preSelectedSymptom ? "selected" : ""}>${symptom}</option>`)
                .join("")}
        </select>
        <button type="button" class="btn btn-danger remove-symptom">
            <i class="bi bi-trash"></i> Hapus
        </button>
    `;

    newGroup.innerHTML = dropdownHTML;
    container.appendChild(newGroup);
}

document.getElementById('add-symptom').addEventListener('click', () => {
    addSymptomBox(); 

    document.getElementById('result').style.display = 'none';
});

document.getElementById('symptom-container').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-symptom')) {
        e.target.closest('.input-group').remove();

        document.getElementById('result').style.display = 'none';
    }
});

document.getElementById('symptom-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const symptoms = Array.from(document.querySelectorAll('.symptom-dropdown'))
                          .map(dropdown => dropdown.value)
                          .filter(value => value !== '');

    fetch('/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms })
    })
    .then(response => response.json())
    .then(data => {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = '';
        if (data.error || data.message) {
            resultDiv.innerHTML = `<p class="text-danger">Tidak ada penyakit dengan kemiripan yang cukup tinggi berdasarkan gejala yang Anda masukkan.</p>`;
        } else {
            const sortedResults = data.results.sort((a, b) => b.similarity - a.similarity);
            const primaryDiagnosis = sortedResults[0];
            const otherDiagnoses = sortedResults.slice(1);
    
            resultDiv.innerHTML += `<p><strong>Diagnosis Utama:</strong> ${primaryDiagnosis.disease} (${(primaryDiagnosis.similarity * 100).toFixed(2)}%)</p>`;
            
            if (otherDiagnoses.length > 0) {
                resultDiv.innerHTML += `<p><strong>Diagnosis Lain yang Mungkin:</strong></p>`;
                otherDiagnoses.forEach(result => {
                    const percentage = (result.similarity * 100).toFixed(2);
                    resultDiv.innerHTML += `<p>- ${result.disease}: ${percentage}%</p>`;
                });
            }
        }
        resultDiv.style.display = 'block'; 
    })    
    .catch(err => {
        console.error('Error:', err);
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `<p class="text-danger">Tidak ada penyakit dengan kemiripan yang cukup tinggi berdasarkan gejala yang Anda masukkan.</p>`;
        resultDiv.style.display = 'block';
    });
});
