import pandas as pd
import numpy as np
from datetime import datetime

# Read the CSV data
df = pd.read_csv('smartphone_evolution.csv')

# Function to convert various date formats to a standard format
# Function to extract year from various date formats
def extract_year(date_str):
    if pd.isna(date_str):
        return np.nan
    
    date_formats = [
        '%d-%b-%y',  # For dates like '18-Sep-11'
        '%d-%b-%Y',  # For dates like '18-Sep-2011'
        '%Y',        # For years only
        '%m %Y',     # For dates like 'September 2013'
        '%b %Y',     # For dates like 'Sep 2013'
        '%b-%y',     # For dates like 'Sep-14'
        '%d-%m-%Y',  # For dates like '01-11-15'
        '%b %d, %Y', # For dates like 'Sep 18, 2013
        '%m %d, %Y', # For dates like 'September 18, 2013
    ]
    
    for date_format in date_formats:
        try:
            date = datetime.strptime(date_str, date_format)
            return date.year
        except ValueError:
            continue
    
    return np.nan

df['Release_Date'] = df['Release_Date'].apply(extract_year).astype('Int64')

df = df.dropna(subset=['Release_Date', 'Primary_Storage', 'Primary_Camera'])

columns_to_drop = ['External_Storage', 'Display_Resolution', 'Front_Camera', 'Display_Refresh_Rate']
df = df.drop(columns=columns_to_drop)

df.to_csv('cleaned_dataset.csv', index=False)
pd.set_option('display.max_columns', 4)
print(df.sample(10))