import os
import json
import re
from bs4 import BeautifulSoup

# NEW LOCATION: We look inside site/reports now
INPUT_FOLDER = 'docs/reports'
OUTPUT_FILE = 'docs/data.json'
    
def get_category_from_filename(filename):
    if "TrendlineReport" in filename:
        return "Trendline Scalper"
    elif "SafeReport" in filename:
        return "Trend Continuation"
    elif "Spike" in filename:
        return "Spike Detector"
    else:
        return "General Strategy"

def parse_report(file_path, filename):
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    category = get_category_from_filename(filename)

    # Extract Symbol
    full_title = soup.title.string if soup.title else ""
    symbol = full_title.replace("Strategy Report", "").replace("Trendline Scalper:", "").strip()
    if not symbol:
        symbol = filename.split('_')[1] if '_' in filename else filename

    stat_values = [div.text.strip() for div in soup.find_all(class_='stat-val')]
    if not stat_values: return None

    stats = {
        'net_profit': stat_values[0],
        'win_rate': stat_values[1],
        'final_balance': stat_values[2],
        'max_drawdown': stat_values[3],
        'total_trades': stat_values[4]
    }

    script_content = soup.find_all('script')[-1].string
    equity_data = []
    if script_content:
        data_match = re.search(r"data:\s*\[([\d\.,\s-]+)\]", script_content)
        if data_match:
            equity_data = [float(x) for x in data_match.group(1).split(',')]

    return {
        'id': f"{category}-{symbol}".lower().replace(' ', '-'),
        'category': category,
        'name': symbol,
        'filename': filename,  # <--- WE SAVE THE FILENAME HERE
        'stats': stats,
        'equity_curve': equity_data
    }

def main():
    all_strategies = []
    
    if not os.path.exists(INPUT_FOLDER):
        print(f"Error: Folder '{INPUT_FOLDER}' not found. Did you move it inside 'site'?")
        return

    files = [f for f in os.listdir(INPUT_FOLDER) if f.endswith('.html')]
    print(f"Scanning 'site/reports'... Found {len(files)} files.")

    for filename in files:
        try:
            path = os.path.join(INPUT_FOLDER, filename)
            data = parse_report(path, filename)
            if data:
                all_strategies.append(data)
                print(f"✅ Parsed: {data['name']}")
        except Exception as e:
            print(f"❌ Error: {e}")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_strategies, f, indent=4)
    print(f"\n🎉 Database updated!")

if __name__ == "__main__":
    main()