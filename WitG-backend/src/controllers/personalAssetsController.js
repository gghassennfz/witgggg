const supabase = require('../supabaseClient');

const getPersonalAssets = async (req, res) => {
    const { user } = req;

    try {
        const { data, error } = await supabase
            .from('personal_assets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching personal assets.', details: error.message });
    }
};

const createPersonalAsset = async (req, res) => {
    const { user } = req;
    const { asset_type, title, content, file_url } = req.body;

    if (!asset_type || !title) {
        return res.status(400).json({ error: 'Asset type and title are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('personal_assets')
            .insert([
                { user_id: user.id, asset_type, title, content, file_url },
            ])
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Server error creating personal asset.', details: error.message });
    }
};

const deletePersonalAsset = async (req, res) => {
    const { user } = req;
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('personal_assets')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            throw error;
        }

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting personal asset.', details: error.message });
    }
};

module.exports = {
    getPersonalAssets,
    createPersonalAsset,
    deletePersonalAsset,
};
