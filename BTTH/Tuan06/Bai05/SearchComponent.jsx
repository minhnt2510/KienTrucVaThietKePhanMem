import React, { useState, useEffect } from 'react';

const SearchComponent = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.trim() !== '') {
                fetch(`http://localhost:8080/api/search?q=${searchTerm}`)
                    .then(res => res.json())
                    .then(data => setResults(data));
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    return (
        <div>
            <h2>Search Form</h2>
            <input 
                type="text" 
                placeholder="Nhập từ khóa tìm kiếm (Debounced)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ul>{results.map((r, idx) => <li key={idx}>{r.name}</li>)}</ul>
        </div>
    );
};

export default SearchComponent;
